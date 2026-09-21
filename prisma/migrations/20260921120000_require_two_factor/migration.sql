-- Per-person switch: staff must set up an authenticator app unless an owner turns this off for them.
ALTER TABLE "user" ADD COLUMN "requireTwoFactor" BOOLEAN NOT NULL DEFAULT true;
