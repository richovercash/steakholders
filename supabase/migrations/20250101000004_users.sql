-- Migration: Create users table
-- Description: User profiles linked to Supabase Auth and organizations

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Link to Supabase Auth
    auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    avatar_url VARCHAR(500),

    -- Organization membership
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role user_role DEFAULT 'worker',

    -- Settings
    notification_preferences JSONB DEFAULT '{"email":true,"sms":false}',
    is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_users_auth_id ON users (auth_id);
CREATE INDEX idx_users_organization ON users (organization_id);
CREATE INDEX idx_users_email ON users (email);

-- Comments
COMMENT ON TABLE users IS 'User profiles linked to Supabase Auth';
COMMENT ON COLUMN users.auth_id IS 'References auth.users(id) from Supabase Auth';
COMMENT ON COLUMN users.role IS 'Role within their organization: owner, manager, or worker';
