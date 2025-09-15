CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_lookup ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_lookup ON user_tenants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);