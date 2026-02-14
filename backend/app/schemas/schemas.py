"""
Pydantic schemas for request validation and response serialization.
"""
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============================================================================
# AUTH
# ============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class RegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=12)
    role: str = Field(default="CSR", pattern="^(Admin|Producer|CSR|ReadOnly)$")


# ============================================================================
# USER
# ============================================================================

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime


# ============================================================================
# ACCOUNT
# ============================================================================

class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(pattern="^(Personal|Commercial)$")
    status: str = Field(default="Active", pattern="^(Active|Inactive|Prospect)$")
    assigned_producer_id: Optional[uuid.UUID] = None
    assigned_csr_id: Optional[uuid.UUID] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, max_length=2)
    zip_code: Optional[str] = Field(default=None, max_length=10)
    county: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    type: Optional[str] = Field(default=None, pattern="^(Personal|Commercial)$")
    status: Optional[str] = Field(default=None, pattern="^(Active|Inactive|Prospect)$")
    primary_contact_id: Optional[uuid.UUID] = None
    assigned_producer_id: Optional[uuid.UUID] = None
    assigned_csr_id: Optional[uuid.UUID] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = Field(default=None, max_length=2)
    zip_code: Optional[str] = Field(default=None, max_length=10)
    county: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    type: str
    status: str
    primary_contact_id: Optional[uuid.UUID] = None
    assigned_producer_id: Optional[uuid.UUID] = None
    assigned_csr_id: Optional[uuid.UUID] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class AccountListResponse(BaseModel):
    items: List[AccountResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# CONTACT
# ============================================================================

class ContactCreate(BaseModel):
    account_id: uuid.UUID
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False
    communication_preference: Optional[str] = None
    date_of_birth: Optional[date] = None

class ContactUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: Optional[bool] = None
    communication_preference: Optional[str] = None
    date_of_birth: Optional[date] = None

class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    account_id: uuid.UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool
    communication_preference: Optional[str] = None
    date_of_birth: Optional[date] = None
    created_at: datetime


# ============================================================================
# CARRIER
# ============================================================================

class CarrierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(pattern="^(Direct|Wholesaler|MGA)$")
    phone: Optional[str] = None
    email: Optional[str] = None
    portal_url: Optional[str] = None
    appetite_notes: Optional[str] = None
    am_best_rating: Optional[str] = None

class CarrierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    type: str
    phone: Optional[str] = None
    email: Optional[str] = None
    portal_url: Optional[str] = None
    appetite_notes: Optional[str] = None
    am_best_rating: Optional[str] = None
    created_at: datetime


# ============================================================================
# POLICY
# ============================================================================

class PolicyCreate(BaseModel):
    account_id: uuid.UUID
    carrier_id: Optional[uuid.UUID] = None
    line_of_business: str = Field(min_length=1, max_length=100)
    policy_number: Optional[str] = None
    effective_date: date
    expiration_date: date
    premium: Optional[Decimal] = None
    payment_plan: Optional[str] = None
    status: str = Field(default="Active", pattern="^(Active|Cancelled|Expired|Non-Renewed|Rewritten)$")
    servicing_owner_id: Optional[uuid.UUID] = None
    producing_agent_id: Optional[uuid.UUID] = None

class PolicyUpdate(BaseModel):
    carrier_id: Optional[uuid.UUID] = None
    line_of_business: Optional[str] = None
    policy_number: Optional[str] = None
    effective_date: Optional[date] = None
    expiration_date: Optional[date] = None
    premium: Optional[Decimal] = None
    payment_plan: Optional[str] = None
    renewal_status: Optional[str] = None
    status: Optional[str] = None
    servicing_owner_id: Optional[uuid.UUID] = None
    producing_agent_id: Optional[uuid.UUID] = None

class PolicyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    account_id: uuid.UUID
    carrier_id: Optional[uuid.UUID] = None
    line_of_business: str
    policy_number: Optional[str] = None
    effective_date: date
    expiration_date: date
    premium: Optional[Decimal] = None
    payment_plan: Optional[str] = None
    renewal_status: str
    status: str
    servicing_owner_id: Optional[uuid.UUID] = None
    producing_agent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

class PolicyListResponse(BaseModel):
    items: List[PolicyResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# INSTALLMENT
# ============================================================================

class InstallmentCreate(BaseModel):
    policy_id: Optional[uuid.UUID] = None
    due_date: date
    amount: Decimal
    payment_method: Optional[str] = None

class InstallmentUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(Scheduled|Reminded|Paid|Past Due|Cancelled)$")
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None

class InstallmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    policy_id: uuid.UUID
    due_date: date
    amount: Decimal
    status: str
    payment_method: Optional[str] = None
    paid_date: Optional[date] = None
    reminder_sent_at: Optional[datetime] = None
    created_at: datetime


# ============================================================================
# TASK
# ============================================================================

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Urgent)$")

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    priority: Optional[str] = Field(default=None, pattern="^(Low|Medium|High|Urgent)$")
    status: Optional[str] = Field(default=None, pattern="^(Open|In Progress|Completed|Cancelled)$")

class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    linked_entity_type: Optional[str] = None
    linked_entity_id: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    created_by: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    priority: str
    status: str
    completed_at: Optional[datetime] = None
    source: str
    created_at: datetime

class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int


# ============================================================================
# SERVICE ITEM (Service Board)
# ============================================================================

class ServiceItemCreate(BaseModel):
    type: str = Field(pattern="^(Renewal|MidTermReview|Rewrite|Endorsement|UWIssue|NonRenewal|PaymentIssue|General)$")
    account_id: uuid.UUID
    policy_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    urgency: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")

class ServiceItemUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern="^(Not Started|In Progress|Awaiting Insured|Awaiting Carrier|Action Required|Completed|Closed|Escalated)$")
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    urgency: Optional[str] = Field(default=None, pattern="^(Low|Medium|High|Critical)$")
    description: Optional[str] = None

class ServiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    type: str
    account_id: uuid.UUID
    policy_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    status: str
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    urgency: str
    workflow_instance_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    # Joined fields for display
    account_name: Optional[str] = None
    policy_lob: Optional[str] = None
    assignee_name: Optional[str] = None

class ServiceBoardResponse(BaseModel):
    items: List[ServiceItemResponse]
    total: int
    counts_by_status: dict
    counts_by_type: dict


# ============================================================================
# PROSPECT
# ============================================================================

class ProspectCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = Field(default=None, pattern="^(Referral|Web|Walk-in|Marketing|Cross-Sell|Other)$")
    source_detail: Optional[str] = None
    referrer_account_id: Optional[uuid.UUID] = None
    lob_interest: Optional[str] = None
    estimated_premium: Optional[Decimal] = None
    current_carrier: Optional[str] = None
    current_expiration: Optional[date] = None
    assigned_producer_id: Optional[uuid.UUID] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None

class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    lob_interest: Optional[str] = None
    estimated_premium: Optional[Decimal] = None
    current_carrier: Optional[str] = None
    current_expiration: Optional[date] = None
    pipeline_stage: Optional[str] = None
    assigned_producer_id: Optional[uuid.UUID] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    close_reason: Optional[str] = None

class ProspectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    first_name: str
    last_name: str
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    referrer_account_id: Optional[uuid.UUID] = None
    lob_interest: Optional[str] = None
    estimated_premium: Optional[Decimal] = None
    current_carrier: Optional[str] = None
    current_expiration: Optional[date] = None
    pipeline_stage: str
    assigned_producer_id: Optional[uuid.UUID] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    close_reason: Optional[str] = None
    converted_account_id: Optional[uuid.UUID] = None


# ============================================================================
# SALES LOG
# ============================================================================

class SalesLogCreate(BaseModel):
    sale_date: date = Field(default_factory=date.today)
    account_id: Optional[uuid.UUID] = None
    prospect_id: Optional[uuid.UUID] = None
    policy_id: Optional[uuid.UUID] = None
    line_of_business: str
    premium: Decimal
    carrier_id: Optional[uuid.UUID] = None
    source: Optional[str] = None
    source_detail: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    sale_type: str = Field(pattern="^(New Business|Rewrite|Cross-Sell|Renewal)$")
    notes: Optional[str] = None

class SalesLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    sale_date: date
    account_id: uuid.UUID
    prospect_id: Optional[uuid.UUID] = None
    policy_id: Optional[uuid.UUID] = None
    line_of_business: str
    premium: Decimal
    carrier_id: Optional[uuid.UUID] = None
    producer_id: uuid.UUID
    source: Optional[str] = None
    source_detail: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    sale_type: str
    notes: Optional[str] = None
    created_at: datetime
    # Joined fields
    account_name: Optional[str] = None
    carrier_name: Optional[str] = None
    producer_name: Optional[str] = None

class SalesTrendResponse(BaseModel):
    period: str
    total_sales: int
    total_premium: Decimal
    by_lob: Optional[dict] = None
    by_source: Optional[dict] = None
    by_zip: Optional[dict] = None
    by_county: Optional[dict] = None


# ============================================================================
# NOTE
# ============================================================================

class NoteCreate(BaseModel):
    content: str = Field(min_length=1)
    linked_entity_type: str
    linked_entity_id: uuid.UUID

class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    content: str
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    created_at: datetime


# ============================================================================
# COMMUNICATION LOG
# ============================================================================

class CommLogCreate(BaseModel):
    direction: str = Field(pattern="^(Inbound|Outbound)$")
    channel: str = Field(pattern="^(Email|Phone|SMS|InPerson|Other)$")
    subject: Optional[str] = None
    body_preview: Optional[str] = None
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    contact_id: Optional[uuid.UUID] = None
    call_duration_seconds: Optional[int] = None

class CommLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    direction: str
    channel: str
    subject: Optional[str] = None
    body_preview: Optional[str] = None
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    contact_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    call_duration_seconds: Optional[int] = None
    sent_at: Optional[datetime] = None
    logged_at: datetime


# ============================================================================
# DOCUMENT
# ============================================================================

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    category: Optional[str] = None
    linked_entity_type: str
    linked_entity_id: uuid.UUID
    description: Optional[str] = None
    uploaded_at: datetime


# ============================================================================
# DASHBOARD
# ============================================================================

class DashboardResponse(BaseModel):
    tasks_due_today: int
    tasks_overdue: int
    service_items_due_this_week: int
    service_items_overdue: int
    installments_due_this_week: int
    installments_past_due: int
    pipeline_value: Decimal
    pipeline_count: int
    sales_this_month: int
    sales_premium_this_month: Decimal
    auto_items_this_month: int  # Allstate quota tracking
    recent_tasks: List[TaskResponse]
    recent_service_items: List[ServiceItemResponse]


# Forward reference resolution
TokenResponse.model_rebuild()
