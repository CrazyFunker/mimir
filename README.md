# Mimir

## Project Overview

A web-based application designed to help knowledge workers stay focused and organized. The application aims to simplify task management by providing clear prioritization while using AI agents to gather contextual information from various professional tools.

### Key Features

- Task categorization system displaying:
  - Three tasks that must be completed today
  - Three tasks that must be completed this week
  - Three tasks to keep in mind for the entire month
- Backend AI agents that connect to multiple tools and platforms (MCPs) including:
  - Professional email inbox
  - Jira and Confluence
  - GitHub
  - Google Drive
- Visual "graph" representation showing task progression throughout the month
  - Completed tasks appear in green
  - Future tasks appear in grey
  - Provides a comprehensive view of past, present, and future work

### User Interface

The application emphasizes a minimalist design with three main functions:

- "Bring me up to speed" - shows current tasks and helps maintain workflow continuity
- "Show me the graph" - visualizes progress to provide a sense of accomplishment
- Configuration options - connect relevant tools and set permissions

### Design Philosophy

- Simplicity is prioritized to avoid the overwhelming nature of feature-heavy applications
- Focuses on maintaining workflow continuity when returning to work after time away
- Provides visual feedback on progress to satisfy the psychological need for accomplishment
- Designed to reduce context-switching and cognitive load for knowledge workers

## Tech Stack

### Frontend

- **React** – JS Web App Framework  
- **Tailwind CSS** – CSS Framework  
- **shadcn/ui** – Design System  
- **GSAP** – JS Animation Library  

### Backend

- **Python** – Programming Language  
- **FastAPI** – Web API Python Framework  
- **Boto3** – Python AWS CLI Library  
- **Chroma** – Vector Database  
- **Supabase** – SQL Database  
- **CrewAI** – Agentic AI Framework  
- **AWS** – LLM Provider  
- **LiteLLM** – LLM Router  
- **Anthropic Claude** – LLM family
- **OpenAI** – LLM family
