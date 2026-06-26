export type Role = 'admin' | 'sme' | 'investigator' | 'radar_advisor'
export type CaseType = 'New Case' | 'Seller Appeal' | 'Amznpend' | 'SOP Discrepancy' | 'Defect Review'
export type AssistanceType = 'Text Assistance' | 'Call Assistance' | 'Multicall'
export type ConsultationStatus = 'Pending' | 'Assigned' | 'In Review' | 'Resolved' | 'Escalated' | 'Flagged'
export type AvailabilityStatus = 'Available' | 'Busy' | 'Away' | 'Off'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  site: string | null
  specializations: string[]
  created_at: string
}

export interface SMESchedule {
  id: string
  sme_id: string
  timezone: string
  languages: string[]
  specializations: string[]
  availability_status: AvailabilityStatus
  shift_start: string | null
  shift_end: string | null
  working_days: string[]
  avg_response_time: number
  current_queue: number
  updated_at: string
  profiles?: Profile
}

export interface Consultation {
  id: string
  investigator_id: string
  sme_id: string | null
  case_type: CaseType
  assistance_type: AssistanceType
  urgency_level: string // kept for DB compat only, not shown in UI
  title: string
  case_details: string
  case_id_reference: string | null
  case_link: string | null
  sop_link: string | null
  sop_section: string | null
  sop_discrepancy_note: string | null
  previous_investigator_conflict: boolean
  conflict_description: string | null
  previous_actions: string | null
  image_urls: string[]
  is_radar: boolean
  status: ConsultationStatus
  resolution: string | null
  submitted_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  updated_at: string
  profiles?: Profile
  sme?: Profile
  consultation_messages?: ConsultationMessage[]
}

export interface ConsultationMessage {
  id: string
  consultation_id: string
  author_id: string
  content: string
  is_sme_response: boolean
  created_at: string
  profiles?: Profile
}

export interface Reply {
  id: string
  post_id: string
  author_id: string
  content: string
  is_sme_answer: boolean
  created_at: string
  profiles?: Profile
}

export interface Category {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'reply' | 'sme_answer'
  from_user_id: string | null
  read: boolean
  created_at: string
  profiles?: Profile
}
