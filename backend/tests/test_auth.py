from datetime import datetime, timezone
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient

from .support import auth, create_verified_user, main, reset_database


class AuthCoreTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_database()

    def test_generate_verification_code_uses_provided_datetime(self) -> None:
        code = auth.generate_verification_code(
            datetime(2026, 4, 18, 12, 0, tzinfo=timezone.utc)
        )
        self.assertEqual(code, "180426")

    def test_hash_and_verify_password_round_trip(self) -> None:
        password = "StrongPassword!42"
        password_hash = auth.hash_password(password)

        self.assertNotEqual(password_hash, password)
        self.assertTrue(auth.verify_password(password, password_hash))
        self.assertFalse(auth.verify_password("wrong-password", password_hash))

    def test_authenticate_user_rejects_unverified_accounts(self) -> None:
        create_verified_user(
            email="pending@example.com",
            password="Pending123!",
            is_verified=False,
        )
        session = main.SessionLocal()
        try:
            with self.assertRaises(HTTPException) as ctx:
                auth.authenticate_user(session, "pending@example.com", "Pending123!")
        finally:
            session.close()

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Email address is not verified.")


class AuthApiTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_database()

    def test_signup_verify_login_and_me_flow(self) -> None:
        with TestClient(main.app) as client:
            signup = client.post(
                "/auth/signup",
                json={"email": "NewUser@Example.com", "password": "MyPass123!"},
            )
            self.assertEqual(signup.status_code, 201)
            self.assertEqual(signup.json()["email"], "newuser@example.com")

            unverified_login = client.post(
                "/auth/login",
                json={"email": "newuser@example.com", "password": "MyPass123!"},
            )
            self.assertEqual(unverified_login.status_code, 403)

            verify = client.post(
                "/auth/verify-email",
                json={
                    "email": "newuser@example.com",
                    "code": auth.generate_verification_code(),
                },
            )
            self.assertEqual(verify.status_code, 200)
            token = verify.json()["access_token"]

            me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(me.status_code, 200)
            self.assertEqual(me.json()["email"], "newuser@example.com")

    def test_signup_rejects_duplicate_email(self) -> None:
        with TestClient(main.app) as client:
            payload = {"email": "duplicate@example.com", "password": "Pass123!"}
            self.assertEqual(client.post("/auth/signup", json=payload).status_code, 201)

            duplicate = client.post("/auth/signup", json=payload)
            self.assertEqual(duplicate.status_code, 409)
            self.assertEqual(
                duplicate.json()["detail"],
                "An account with this email already exists.",
            )

    def test_verify_email_rejects_invalid_code(self) -> None:
        with TestClient(main.app) as client:
            client.post(
                "/auth/signup",
                json={"email": "verifyme@example.com", "password": "Pass123!"},
            )

            response = client.post(
                "/auth/verify-email",
                json={"email": "verifyme@example.com", "code": "000000"},
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.json()["detail"], "Invalid verification code.")

    def test_invalid_token_is_rejected(self) -> None:
        with TestClient(main.app) as client:
            response = client.get(
                "/auth/me",
                headers={"Authorization": "Bearer definitely-not-a-jwt"},
            )
            self.assertEqual(response.status_code, 401)
            self.assertEqual(
                response.json()["detail"], "Invalid authentication token."
            )
