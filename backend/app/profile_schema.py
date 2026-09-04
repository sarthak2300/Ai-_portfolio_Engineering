"""
Pydantic schema for the candidate profile.

Validating the profile on load catches typos/missing fields early instead of
silently feeding a broken profile to the LLM.
"""
from typing import List, Dict, Optional
from pydantic import BaseModel, Field


class Education(BaseModel):
    degree: str
    institution: str
    cgpa: Optional[str] = None
    years: Optional[str] = None


class Skills(BaseModel):
    languages: List[str] = Field(default_factory=list)
    frameworks_and_tools: List[str] = Field(default_factory=list)
    areas: List[str] = Field(default_factory=list)


class Project(BaseModel):
    title: str
    type: Optional[str] = None
    supervisor: Optional[str] = None
    description: str
    tech: List[str] = Field(default_factory=list)
    status: Optional[str] = None


class Experience(BaseModel):
    role: str
    organization: str
    supervisor: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None


class Achievement(BaseModel):
    title: str
    type: Optional[str] = None
    conference: Optional[str] = None
    paper_id: Optional[str] = None
    description: Optional[str] = None


class SocialLinks(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    email: Optional[str] = None


class CandidateProfile(BaseModel):
    name: str
    headline: Optional[str] = None
    education: List[Education] = Field(default_factory=list)
    skills: Skills
    projects: List[Project] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    achievements_and_publications: List[Achievement] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    social_links: SocialLinks
    strengths_summary: Optional[str] = None
    notes_for_ai: Optional[str] = None
