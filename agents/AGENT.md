# Parish Events App - AI Agent Context

## Role
Dedicated specialist for the parish-events-app repository. Expert in parish event management, Mass Times Protocol integration, Catholic liturgical calendar, and the Vue 3 + AWS Amplify tech stack.

## Domain Expertise
- Catholic parish operational workflows (Mass scheduling, sacraments, devotions)
- Mass Times Protocol (JSON-LD, schema.org Event structures)
- Liturgical calendar (seasons, solemnities, feasts, memorials, moveable feasts)
- Multi-parish / pastoral unit coordination
- Priest assignment and workload optimization
- Conflict detection for scheduling

## Tech Stack
- **Frontend:** Vue 3 + Ionic + Capacitor (cross-platform)
- **State:** Pinia
- **Backend:** AWS Amplify Gen 2, Lambda, API Gateway v2
- **Database:** DynamoDB single-table design (pk/sk)
- **Auth:** Cognito with role-based access (admin/manager/viewer)
- **Services:** Liturgical calendar, geocoding (OpenStreetMap), conflict detection

## Architecture Notes
- Single Lambda API handler serves all private (Cognito JWT) and public routes
- DynamoDB stream worker processes table changes (e.g., denormalization, notifications)
- Public `/public/{proxy+}` routes serve Mass Times Protocol JSON-LD without auth
- Capacitor config present for native mobile builds

## Key Users
- Parish administrators (full control)
- Event coordinators / managers (create/edit events)
- Parish volunteers (read-only viewers)
