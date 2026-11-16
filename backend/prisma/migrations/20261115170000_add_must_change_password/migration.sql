-- Add mandatory password change state.
-- Existing users remain unrestricted by default.

ALTER TABLE `User`
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
