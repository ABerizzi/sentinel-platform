-- ============================================================================
-- SENTINEL AGENCY MANAGEMENT PLATFORM — DATABASE SCHEMA
-- Version: 1.1
-- Database: PostgreSQL 15+
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE account_type AS ENUM ('Personal', 'Commercial');
CREATE TYPE account_status AS ENUM ('Active', 'Inactive', 'Prospect');

CREATE TYPE policy_status AS ENUM ('Active', 'Cancelled', 'Expired', 'Non-Renewed', 'Rewritten');
CREATE TYPE payment_plan AS ENUM ('Annual', 'Semi-Annual', 'Quarterly', 'Monthly', 'EFT');
CREATE TYPE renewal_status AS ENUM ('Not Started', 'Contacted', 'Awaiting Insured', 'Quoted', 'Proposal Sent', 'Bound', 'Closed-Lost');

CREATE TYPE installment_status AS ENUM ('Scheduled', 'Reminded', 'Paid', 'Past Due', 'Cancelled');

CREATE TYPE carrier_type AS ENUM ('Direct', 'Wholesaler', 'MGA');

CREATE TYPE pipeline_stage AS ENUM ('New Lead', 'Contacted', 'Needs Analysis', 'Quoting', 'Proposal Sent', 'Negotiation', 'Closed-Won', 'Closed-Lost');

CREATE TYPE prospect_source AS ENUM ('Referral', 'Web', 'Walk-in', 'Marketing', 'Cross-Sell', 'Other');

CREATE TYPE quote_source_method AS ENUM ('Manual', 'OCR');
CREATE TYPE quote_status AS ENUM ('Pending', 'Selected', 'Declined');

CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
CREATE TYPE task_status AS ENUM ('Open', 'In Progress', 'Completed', 'Cancelled');
CREATE TYPE task_source AS ENUM ('Manual', 'Automation', 'Workflow');

CREATE TYPE comm_direction AS ENUM ('Inbound', 'Outbound');
CREATE TYPE comm_channel AS ENUM ('Email', 'Phone', 'SMS', 'InPerson', 'Other');

CREATE TYPE service_item_type AS ENUM ('Renewal', 'MidTermReview', 'Rewrite', 'Endorsement', 'UWIssue', 'NonRenewal', 'PaymentIssue', 'General');
CREATE TYPE service_item_status AS ENUM ('Not Started', 'In Progress', 'Awaiting Insured', 'Awaiting Carrier', 'Action Required', 'Completed', 'Closed', 'Escalated');
CREATE TYPE service_item_urgency AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TYPE workflow_status AS ENUM ('Active', 'Completed', 'Cancelled');
CREATE TYPE workflow_step_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Skipped', 'Blocked');

CREATE TYPE submission_status AS ENUM ('Drafted', 'Submitted', 'Quoted', 'Declined', 'No Response');

CREATE TYPE claim_status AS ENUM ('Reported', 'Carrier Notified', 'In Progress', 'Resolved', 'Closed');

CREATE TYPE endorsement_status AS ENUM ('Requested', 'Processing', 'Completed', 'Cancelled');

CREATE TYPE sequence_trigger AS ENUM ('Manual', 'Pipeline Stage', 'Event');
CREATE TYPE sequence_target AS ENUM ('Prospect', 'Client');
CREATE TYPE enrollment_status AS ENUM ('Active', 'Completed', 'Paused', 'Cancelled');
CREATE TYPE step_action_type AS ENUM ('Send Email', 'Create Task', 'Internal Notification');
CREATE TYPE step_exec_result AS ENUM ('Sent', 'Opened', 'Clicked', 'Bounced', 'Task Created', 'Skipped');

CREATE TYPE automation_trigger_type AS ENUM ('Date-based', 'Event-based', 'Field Change');
CREATE TYPE automation_exec_status AS ENUM ('Success', 'Failed', 'Skipped');

CREATE TYPE review_trigger AS ENUM ('NewBusiness', 'Renewal', 'ClaimResolved', 'MidTermReview', 'Manual');
CREATE TYPE review_status AS ENUM ('Pending', 'Sent', 'Reminded', 'ReviewReceived', 'NoResponse');
CREATE TYPE review_platform AS ENUM ('Google', 'Allstate', 'Both');

CREATE TYPE referral_request_status AS ENUM ('Pending', 'Sent', 'Reminded', 'ReferralReceived', 'NoResponse');

CREATE TYPE sale_type AS ENUM ('New Business', 'Rewrite', 'Cross-Sell', 'Renewal');

CREATE TYPE user_role AS ENUM ('Admin', 'Producer', 'CSR', 'ReadOnly');

CREATE TYPE audit_action AS ENUM ('Create', 'Update', 'Delete', 'Login', 'Logout', 'Export', 'EmailSent', 'StatusChange');

CREATE TYPE template_category AS ENUM ('Renewal', 'Installment', 'Welcome', 'Proposal', 'Nurture', 'Review', 'Referral', 'Service', 'Claims', 'Engagement', 'Sales', 'Commercial', 'Other');

CREATE TYPE proposal_template_type AS ENUM ('Personal', 'Commercial');

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- 29. User
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CSR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1. Account
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type account_type NOT NULL,
    status account_status NOT NULL DEFAULT 'Active',
    primary_contact_id UUID,  -- FK added after contacts table
    assigned_producer_id UUID REFERENCES users(id),
    assigned_csr_id UUID REFERENCES users(id),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_accounts_zip ON accounts(zip_code);
CREATE INDEX idx_accounts_county ON accounts(county);
CREATE INDEX idx_accounts_producer ON accounts(assigned_producer_id);
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin(name gin_trgm_ops);

-- 2. Contact
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    role VARCHAR(50),  -- Insured, Decision Maker, Driver, Officer, etc.
    is_primary BOOLEAN NOT NULL DEFAULT false,
    communication_preference VARCHAR(50),  -- Email, Phone, Text
    date_of_birth DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin((first_name || ' ' || last_name) gin_trgm_ops);

-- Add FK for Account.primary_contact_id
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_primary_contact
    FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 5. Carrier
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type carrier_type NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    portal_url VARCHAR(500),
    appetite_notes TEXT,
    am_best_rating VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carriers_name ON carriers(name);

-- 6. Carrier Contact
CREATE TABLE carrier_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    specialty_lobs TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carrier_contacts_carrier ON carrier_contacts(carrier_id);

-- 3. Policy
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES carriers(id),
    line_of_business VARCHAR(100) NOT NULL,
    policy_number VARCHAR(100),
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    premium DECIMAL(12,2),
    payment_plan payment_plan,
    renewal_status renewal_status NOT NULL DEFAULT 'Not Started',
    status policy_status NOT NULL DEFAULT 'Active',
    servicing_owner_id UUID REFERENCES users(id),
    producing_agent_id UUID REFERENCES users(id),
    prior_policy_id UUID REFERENCES policies(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policies_account ON policies(account_id);
CREATE INDEX idx_policies_carrier ON policies(carrier_id);
CREATE INDEX idx_policies_expiration ON policies(expiration_date);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_lob ON policies(line_of_business);
CREATE INDEX idx_policies_renewal_status ON policies(renewal_status);
CREATE INDEX idx_policies_servicing_owner ON policies(servicing_owner_id);

-- 4. Installment
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status installment_status NOT NULL DEFAULT 'Scheduled',
    payment_method VARCHAR(50),
    paid_date DATE,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_installments_policy ON installments(policy_id);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);

-- 7. Prospect
CREATE TABLE prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    source prospect_source,
    source_detail VARCHAR(255),
    referrer_account_id UUID REFERENCES accounts(id),
    lob_interest VARCHAR(255),
    estimated_premium DECIMAL(12,2),
    current_carrier VARCHAR(255),
    current_expiration DATE,
    pipeline_stage pipeline_stage NOT NULL DEFAULT 'New Lead',
    assigned_producer_id UUID REFERENCES users(id),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    close_reason TEXT,
    converted_account_id UUID REFERENCES accounts(id)
);

CREATE INDEX idx_prospects_stage ON prospects(pipeline_stage);
CREATE INDEX idx_prospects_source ON prospects(source);
CREATE INDEX idx_prospects_producer ON prospects(assigned_producer_id);
CREATE INDEX idx_prospects_zip ON prospects(zip_code);
CREATE INDEX idx_prospects_county ON prospects(county);
CREATE INDEX idx_prospects_name_trgm ON prospects USING gin((first_name || ' ' || last_name) gin_trgm_ops);

-- ============================================================================
-- DOCUMENTS, NOTES, TASKS
-- ============================================================================

-- 9. Document (polymorphic)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    file_path TEXT,
    file_type VARCHAR(50),
    file_size BIGINT,
    category VARCHAR(50),  -- Dec Page, Application, Loss Run, Proposal, Certificate, Quote, ACORD Form, etc.
    linked_entity_type VARCHAR(50) NOT NULL,  -- Account, Policy, WorkflowInstance, Claim, Prospect
    linked_entity_id UUID NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    onedrive_file_id VARCHAR(500)
);

CREATE INDEX idx_documents_entity ON documents(linked_entity_type, linked_entity_id);
CREATE INDEX idx_documents_category ON documents(category);

-- 10. Note (polymorphic)
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id UUID NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_entity ON notes(linked_entity_type, linked_entity_id);
CREATE INDEX idx_notes_created ON notes(created_at DESC);

-- 11. Task (polymorphic)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    linked_entity_type VARCHAR(50),
    linked_entity_id UUID,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    due_date DATE,
    priority task_priority NOT NULL DEFAULT 'Medium',
    status task_status NOT NULL DEFAULT 'Open',
    completed_at TIMESTAMPTZ,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule VARCHAR(255),
    source task_source NOT NULL DEFAULT 'Manual',
    workflow_step_id UUID,  -- FK added after workflow_steps table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_entity ON tasks(linked_entity_type, linked_entity_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ============================================================================
-- COMMUNICATION LOG
-- ============================================================================

-- 12. Communication Log (polymorphic)
CREATE TABLE communication_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    direction comm_direction NOT NULL,
    channel comm_channel NOT NULL,
    subject VARCHAR(500),
    body_preview TEXT,
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id UUID NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    user_id UUID REFERENCES users(id),
    outlook_message_id VARCHAR(500),
    template_id UUID,  -- FK added after email_templates table
    call_duration_seconds INTEGER,
    sent_at TIMESTAMPTZ,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comm_logs_entity ON communication_logs(linked_entity_type, linked_entity_id);
CREATE INDEX idx_comm_logs_contact ON communication_logs(contact_id);
CREATE INDEX idx_comm_logs_user ON communication_logs(user_id);
CREATE INDEX idx_comm_logs_channel ON communication_logs(channel);
CREATE INDEX idx_comm_logs_logged ON communication_logs(logged_at DESC);

-- 39. Communication Log Link (multi-entity linking)
CREATE TABLE communication_log_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comm_log_id UUID NOT NULL REFERENCES communication_logs(id) ON DELETE CASCADE,
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id UUID NOT NULL
);

CREATE INDEX idx_comm_log_links_comm ON communication_log_links(comm_log_id);
CREATE INDEX idx_comm_log_links_entity ON communication_log_links(linked_entity_type, linked_entity_id);

-- ============================================================================
-- SERVICE BOARD
-- ============================================================================

-- 13. Service Item
CREATE TABLE service_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type service_item_type NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES policies(id),
    description TEXT,
    status service_item_status NOT NULL DEFAULT 'Not Started',
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    urgency service_item_urgency NOT NULL DEFAULT 'Medium',
    workflow_instance_id UUID,  -- FK added after workflow_instances table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_service_items_type ON service_items(type);
CREATE INDEX idx_service_items_status ON service_items(status);
CREATE INDEX idx_service_items_account ON service_items(account_id);
CREATE INDEX idx_service_items_policy ON service_items(policy_id);
CREATE INDEX idx_service_items_assigned ON service_items(assigned_to);
CREATE INDEX idx_service_items_due_date ON service_items(due_date);
CREATE INDEX idx_service_items_urgency ON service_items(urgency);

-- ============================================================================
-- WORKFLOWS
-- ============================================================================

-- 14. Workflow Template
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,  -- Personal Renewal, Commercial Renewal, New Business, Endorsement, etc.
    lob_applicability TEXT,
    steps_json JSONB NOT NULL,   -- Ordered list of step definitions
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Workflow Instance
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES workflow_templates(id),
    policy_id UUID REFERENCES policies(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    status workflow_status NOT NULL DEFAULT 'Active',
    current_step INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    assigned_producer_id UUID REFERENCES users(id),
    assigned_csr_id UUID REFERENCES users(id)
);

CREATE INDEX idx_workflow_instances_account ON workflow_instances(account_id);
CREATE INDEX idx_workflow_instances_policy ON workflow_instances(policy_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);

-- Add FK for service_items.workflow_instance_id
ALTER TABLE service_items ADD CONSTRAINT fk_service_items_workflow
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id);

-- 16. Workflow Step
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    status workflow_step_status NOT NULL DEFAULT 'Pending',
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_steps_instance ON workflow_steps(instance_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);

-- Add FK for tasks.workflow_step_id
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_workflow_step
    FOREIGN KEY (workflow_step_id) REFERENCES workflow_steps(id);

-- 17. Submission (for commercial renewals)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES carriers(id),
    carrier_contact_id UUID REFERENCES carrier_contacts(id),
    lobs_included TEXT,
    date_submitted DATE,
    date_response DATE,
    status submission_status NOT NULL DEFAULT 'Drafted',
    premium_quoted DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_workflow ON submissions(workflow_instance_id);
CREATE INDEX idx_submissions_carrier ON submissions(carrier_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============================================================================
-- QUOTES
-- ============================================================================

-- 8. Quote
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id UUID REFERENCES prospects(id),
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    carrier_id UUID REFERENCES carriers(id),
    line_of_business VARCHAR(100),
    premium DECIMAL(12,2),
    deductible VARCHAR(255),
    coverage_summary TEXT,
    coverage_limits_json JSONB,
    commission_pct DECIMAL(5,2),
    subjectivities TEXT,
    source_method quote_source_method NOT NULL DEFAULT 'Manual',
    ocr_confidence_score DECIMAL(5,2),
    original_document_id UUID REFERENCES documents(id),
    status quote_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_prospect ON quotes(prospect_id);
CREATE INDEX idx_quotes_workflow ON quotes(workflow_instance_id);
CREATE INDEX idx_quotes_carrier ON quotes(carrier_id);

-- ============================================================================
-- CLAIMS & ENDORSEMENTS
-- ============================================================================

-- 18. Claim
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    date_of_loss DATE,
    date_reported DATE NOT NULL DEFAULT CURRENT_DATE,
    carrier_claim_number VARCHAR(100),
    description TEXT,
    estimated_amount DECIMAL(12,2),
    status claim_status NOT NULL DEFAULT 'Reported',
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    service_item_id UUID REFERENCES service_items(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_account ON claims(account_id);
CREATE INDEX idx_claims_status ON claims(status);

-- 19. Endorsement
CREATE TABLE endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id),
    description TEXT NOT NULL,
    requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE,
    premium_change DECIMAL(10,2),
    status endorsement_status NOT NULL DEFAULT 'Requested',
    processed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    service_item_id UUID REFERENCES service_items(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_endorsements_policy ON endorsements(policy_id);
CREATE INDEX idx_endorsements_status ON endorsements(status);

-- ============================================================================
-- EMAIL TEMPLATES & PROPOSALS
-- ============================================================================

-- 20. Email Template
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    category template_category NOT NULL,
    merge_fields JSONB,  -- Array of available merge field names
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_slug ON email_templates(slug);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Add FK for communication_logs.template_id
ALTER TABLE communication_logs ADD CONSTRAINT fk_comm_logs_template
    FOREIGN KEY (template_id) REFERENCES email_templates(id);

-- 21. Proposal Template
CREATE TABLE proposal_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type proposal_template_type NOT NULL,
    logo_file_path TEXT,
    header_html TEXT,
    footer_html TEXT,
    sections_config_json JSONB NOT NULL,  -- Which sections appear and in what order
    agent_signature_block TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NURTURE SEQUENCES
-- ============================================================================

-- 22. Nurture Sequence
CREATE TABLE nurture_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type sequence_trigger NOT NULL,
    target_type sequence_target NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. Sequence Step
CREATE TABLE sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES nurture_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 0,
    action_type step_action_type NOT NULL,
    email_template_id UUID REFERENCES email_templates(id),
    task_template_json JSONB,  -- Task details if action is Create Task
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sequence_steps_sequence ON sequence_steps(sequence_id);

-- 24. Sequence Enrollment
CREATE TABLE sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES nurture_sequences(id),
    prospect_id UUID REFERENCES prospects(id),
    account_id UUID REFERENCES accounts(id),
    current_step_order INTEGER NOT NULL DEFAULT 0,
    status enrollment_status NOT NULL DEFAULT 'Active',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_prospect ON sequence_enrollments(prospect_id);
CREATE INDEX idx_enrollments_account ON sequence_enrollments(account_id);
CREATE INDEX idx_enrollments_status ON sequence_enrollments(status);

-- 25. Sequence Step Execution
CREATE TABLE sequence_step_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    result step_exec_result,
    comm_log_id UUID REFERENCES communication_logs(id)
);

CREATE INDEX idx_step_executions_enrollment ON sequence_step_executions(enrollment_id);

-- ============================================================================
-- AUTOMATION ENGINE
-- ============================================================================

-- 26. Automation Rule
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type automation_trigger_type NOT NULL,
    trigger_config_json JSONB NOT NULL,   -- Trigger parameters (days before, field name, etc.)
    conditions_json JSONB,                 -- Additional conditions to evaluate
    actions_json JSONB NOT NULL,           -- Actions to perform when triggered
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 27. Automation Execution
CREATE TABLE automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    actions_taken_json JSONB,
    status automation_exec_status NOT NULL,
    error_message TEXT
);

CREATE INDEX idx_auto_exec_rule ON automation_executions(rule_id);
CREATE INDEX idx_auto_exec_target ON automation_executions(target_entity_type, target_entity_id);
CREATE INDEX idx_auto_exec_triggered ON automation_executions(triggered_at DESC);

-- Idempotency: prevent same rule from firing on same entity twice
CREATE UNIQUE INDEX idx_auto_exec_unique ON automation_executions(rule_id, target_entity_type, target_entity_id)
    WHERE status = 'Success';

-- ============================================================================
-- REMINDERS
-- ============================================================================

-- 28. Reminder
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id UUID NOT NULL,
    reminder_date TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX idx_reminders_date ON reminders(reminder_date) WHERE NOT is_dismissed;
CREATE INDEX idx_reminders_entity ON reminders(linked_entity_type, linked_entity_id);

-- ============================================================================
-- TAGS
-- ============================================================================

-- 31. Tag
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7)  -- Hex color code
);

-- 32. Account Tag
CREATE TABLE account_tags (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (account_id, tag_id)
);

-- 33. Prospect Tag
CREATE TABLE prospect_tags (
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prospect_id, tag_id)
);

-- ============================================================================
-- SALES & COMMISSIONS
-- ============================================================================

-- 35. Sales Log Entry
CREATE TABLE sales_log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    prospect_id UUID REFERENCES prospects(id),
    policy_id UUID REFERENCES policies(id),
    line_of_business VARCHAR(100) NOT NULL,
    premium DECIMAL(12,2) NOT NULL,
    carrier_id UUID REFERENCES carriers(id),
    producer_id UUID NOT NULL REFERENCES users(id),
    source prospect_source,
    source_detail VARCHAR(255),
    zip_code VARCHAR(10),
    county VARCHAR(100),
    sale_type sale_type NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_log_date ON sales_log_entries(date);
CREATE INDEX idx_sales_log_lob ON sales_log_entries(line_of_business);
CREATE INDEX idx_sales_log_zip ON sales_log_entries(zip_code);
CREATE INDEX idx_sales_log_county ON sales_log_entries(county);
CREATE INDEX idx_sales_log_source ON sales_log_entries(source);
CREATE INDEX idx_sales_log_producer ON sales_log_entries(producer_id);
CREATE INDEX idx_sales_log_carrier ON sales_log_entries(carrier_id);
CREATE INDEX idx_sales_log_type ON sales_log_entries(sale_type);

-- 34. Commission
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id),
    carrier_id UUID REFERENCES carriers(id),
    expected_amount DECIMAL(10,2),
    expected_pct DECIMAL(5,2),
    received_amount DECIMAL(10,2),
    received_date DATE,
    period VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Expected',  -- Expected, Received, Discrepancy
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commissions_policy ON commissions(policy_id);
CREATE INDEX idx_commissions_status ON commissions(status);

-- ============================================================================
-- REVIEWS & REFERRALS
-- ============================================================================

-- 36. Review Request
CREATE TABLE review_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    trigger_event review_trigger NOT NULL,
    status review_status NOT NULL DEFAULT 'Pending',
    review_platform review_platform,
    email_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    review_received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_requests_account ON review_requests(account_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);

-- 37. Referral Request
CREATE TABLE referral_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    trigger_event VARCHAR(50) NOT NULL,  -- NewBusiness, Renewal, Manual
    status referral_request_status NOT NULL DEFAULT 'Pending',
    email_sent_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    referral_received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_requests_account ON referral_requests(account_id);
CREATE INDEX idx_referral_requests_status ON referral_requests(status);

-- 38. Referral Tracking
CREATE TABLE referral_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_account_id UUID NOT NULL REFERENCES accounts(id),
    referred_prospect_id UUID NOT NULL REFERENCES prospects(id),
    referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
    converted BOOLEAN NOT NULL DEFAULT false,
    converted_date DATE,
    reward_provided BOOLEAN DEFAULT false,
    reward_description VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_tracking_referrer ON referral_tracking(referrer_account_id);
CREATE INDEX idx_referral_tracking_prospect ON referral_tracking(referred_prospect_id);

-- ============================================================================
-- ACORD FORM MAPPINGS
-- ============================================================================

-- 40. ACORD Form Mapping (configuration table)
CREATE TABLE acord_form_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_type VARCHAR(50) NOT NULL,  -- e.g., "ACORD 125", "ACORD 126"
    form_description VARCHAR(255),
    field_mappings_json JSONB NOT NULL,  -- Maps platform field paths to ACORD field identifiers
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG (IMMUTABLE)
-- ============================================================================

-- 30. Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata_json JSONB
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Prevent updates and deletes on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are immutable. UPDATE and DELETE operations are not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_log_immutable_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_mutation();

-- ============================================================================
-- HELPER: Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have the column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON installments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON carriers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON endorsements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON service_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON proposal_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON nurture_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON review_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON referral_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Default Admin User (password must be changed on first login)
-- ============================================================================
-- NOTE: Insert the admin user via the application's user creation flow,
-- which handles password hashing. Do not insert raw passwords here.

-- ============================================================================
-- SEED DATA: Common Lines of Business
-- ============================================================================
-- These are reference values. The line_of_business field is VARCHAR to allow
-- flexibility, but these are the expected common values:
--
-- Personal Lines:
--   Personal Auto, Homeowners, Condo, Renters, Umbrella, Flood, Dwelling Fire
--
-- Commercial Lines:
--   Commercial General Liability, Business Owners Policy, Commercial Auto,
--   Workers Compensation, Commercial Property, Professional Liability,
--   Cyber Liability, Umbrella-Commercial, Inland Marine, Commercial Flood

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
