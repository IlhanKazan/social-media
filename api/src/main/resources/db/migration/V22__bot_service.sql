INSERT INTO roles (name) VALUES ('ROLE_BOT');

INSERT INTO system_settings (key, value_bool)
VALUES ('bot_enabled', FALSE)
ON CONFLICT (key) DO NOTHING;
