# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- GitHub workflow configuration
- Project documentation structure
- **LLM-powered personalized email generation** for retention campaigns
  - Backend endpoint: `/churn/v2/organizations/{org_id}/customers/{customer_id}/generate-personalized-email`
  - Uses OpenAI GPT-4o-mini to generate personalized HTML emails based on customer churn risk
  - Analyzes customer transaction history, behavior patterns, and risk segments
  - Returns HTML email template with subject line and styled body
  - Falls back to default template if OPENAI_API_KEY is not set
  - Integrated with frontend `EmailCampaign` page for one-click email generation

### Changed

### Fixed

### Removed

---

## How to Use This File

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements