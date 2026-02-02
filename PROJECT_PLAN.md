# Parish Events Manager - Project Plan

## ✅ **What's Complete**

### 🏗️ **Foundation & Architecture**
- **Vue 3 + Ionic + AWS Amplify Gen 2** tech stack setup
- **Cross-platform ready** (web, iOS, Android via Capacitor)
- **TypeScript + Pinia** for type safety and state management
- **DynamoDB single-table design** with proper key patterns
- **Cognito authentication** with role-based permissions

### 📊 **Data Model & Types**
- Complete **shared type definitions** for Parish, Event, Location, Priest, User
- **Mass Times Protocol compliance** with JSON-LD schema.org structure  
- **Multi-tenant design** supporting multiple parishes per user
- **Role-based access** (admin, manager, viewer) with proper permissions

### 🔧 **API & Backend**
- **Lambda API handler** with authentication and authorization
- **Public JSON-LD endpoints** for Mass Times Protocol compliance (`/public/parish/{id}/events`)
- **DynamoDB integration** with proper error handling
- **CORS configuration** for cross-platform access

### 🎨 **Frontend Structure**
- **Parish dashboard** with create/list functionality
- **Navigation system** with tabbed parish views
- **Authentication flow** with public/private route handling
- **Responsive design** optimized for both desktop and mobile

## 🚧 **Next Steps (Priority Order)**

### **Phase 1: Core Event Management (Week 1-2)**
1. **Complete Event CRUD**
   - Event creation form with all fields
   - Event editing and deletion
   - Validation and error handling

2. **Location Management**
   - Location CRUD with address handling
   - OpenStreetMap integration for place selection
   - Default location settings

3. **Priest Management**
   - Priest CRUD with contact information
   - Active/inactive status management
   - Assignment to events as celebrant/assistant

### **Phase 2: Advanced Scheduling (Week 3-4)**  
1. **Calendar Views**
   - Visual calendar component with month/week views
   - Event creation directly from calendar
   - Conflict detection and scheduling optimization

2. **Recurrence Patterns**
   - Weekly, monthly, yearly recurrence
   - Exception date handling (holidays, cancellations)
   - Seasonal schedule management (summer/winter)

3. **Mass Times Protocol Output**
   - Full JSON-LD generation with all schema.org fields
   - Proper timezone handling
   - Validation against protocol standards

### **Phase 3: User Management & Polish (Week 5-6)**
1. **Parish Administration**
   - User invitation system
   - Role management interface
   - Parish settings and configuration

2. **Data Import/Export**
   - CSV import for existing schedules
   - Backup and restore functionality
   - Migration tools from other systems

3. **Mobile App Optimization**
   - Capacitor setup and native builds
   - Push notifications for event updates
   - Offline functionality with sync

## 🎯 **Key Features in Detail**

### **Event Scheduling System**
```
✅ Specific date events
🚧 Weekly recurrence (every Sunday at 10:00)
🚧 Multiple services per day
🚧 Exception handling (Christmas, Easter schedule changes)
🚧 Seasonal schedules (summer/winter time changes)
```

### **Location Integration**
```
🚧 OpenStreetMap widget for Catholic place selection
🚧 Address validation and geocoding
🚧 Multiple locations per parish (church, chapel, hall)
🚧 Capacity and accessibility information
```

### **User Roles & Permissions**
```
✅ Admin: Full parish management + user invitations
✅ Manager: Event creation/editing + priest/location management  
✅ Viewer: Read-only access to schedules
🚧 Custom role definitions
🚧 Audit logs for changes
```

### **Public API Compliance**
```
✅ JSON-LD structure following schema.org Event
✅ OpenStreetMap location references
🚧 Wikidata event type classification  
🚧 Priest performer information in structured format
🚧 SEO optimization for search discovery
```

## 🔗 **External Integrations (Future)**

- **Google Calendar sync** for personal scheduling
- **Parish website embedding** via iframe or widget
- **Catholic app directory** submissions
- **Liturgical calendar API** integration for automatic holy days
- **Email notifications** for event changes
- **QR code generation** for easy mobile access

## 📱 **Deployment Strategy**

1. **Development**: Amplify sandbox environment
2. **Testing**: Staging environment with test parishes  
3. **Production**: Multi-region AWS deployment
4. **Mobile**: App Store + Google Play distribution

---

**Total Estimated Timeline: 6-8 weeks to MVP**
**Current Status: ~25% complete (foundation + data model)**

The architecture is solid and extensible. The next major milestone is completing the event management CRUD operations and location/priest management.