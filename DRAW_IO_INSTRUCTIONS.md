# 🎨 Draw.io Instructions - Step by Step

## Quick Method (Use Mermaid - 5 minutes!)

### Option 1: Use Mermaid Live Editor (FASTEST)

1. Go to: https://mermaid.live/
2. Copy the content from `SYSTEM_DIAGRAM.mmd`
3. Paste it into the editor
4. Click "Download PNG" or "Download SVG"
5. **Done!** You have your diagram ✅

---

## Option 2: Manual Draw.io (15-20 minutes)

### Step 1: Open Draw.io
Go to: https://app.diagrams.net/

**Choose:** Device (save to your computer)

---

### Step 2: Basic Setup

1. Delete the default shapes
2. Click **Arrange** → **Layout** → **Vertical Flow**
3. Set canvas to **A3 Landscape** (File → Page Setup)

---

### Step 3: Add Components (Copy this order)

#### 🌐 **TOP: Client Layer**

```
Shape: Rounded Rectangle
Text: "Clients (Web/Mobile/API)"
Color: Light Gray (#f8f9fa)
Size: Medium
```

**Add arrow down** ↓

---

#### 🔷 **Layer 1: API Gateway** (BLUE)

```
Shape: Rectangle with rounded corners
Text: "API Gateway Service
       Port: 3000
       ━━━━━━━━━━━━━━
       ✓ Authentication
       ✓ Validation
       ✓ Idempotency Check
       ✓ Status Tracking"
Color: Blue (#007bff)
Font: White
Border: Thick (3px)
```

**Add 3 arrows from Gateway:**
- Right → User Service
- Right → Template Service  
- Down → RabbitMQ

---

#### 🔷 **Layer 2: Core Services** (BLUE)

**User Service:**
```
Shape: Rectangle
Text: "User Service
       Port: 3001
       ━━━━━━━━━━━━━━
       • User Management
       • Preferences
       • Push Tokens
       • JWT Auth"
Color: Blue (#007bff)
Position: Right of Gateway
```

**Template Service:**
```
Shape: Rectangle
Text: "Template Service
       Port: 3002
       ━━━━━━━━━━━━━━
       • Template Storage
       • Variable Substitution
       • Multi-language
       • Version History"
Color: Blue (#007bff)
Position: Right of User Service
```

**Add arrows from both to PostgreSQL databases (purple cylinders)**

---

#### 🟠 **Layer 3: Message Queue** (ORANGE - CENTER)

**RabbitMQ:**
```
Shape: Large Rectangle
Text: "RabbitMQ Message Broker
       ━━━━━━━━━━━━━━━━━━
       Exchange: notifications.direct
       ━━━━━━━━━━━━━━━━━━"
Color: Orange (#fd7e14)
Font: White
Size: Large
```

**Inside RabbitMQ, add 3 boxes:**

1. **Email Queue:**
   ```
   Text: "📧 email.queue (Durable)"
   Color: Light Orange
   ```

2. **Push Queue:**
   ```
   Text: "📱 push.queue (Durable)"
   Color: Light Orange
   ```

3. **Dead Letter Queue:**
   ```
   Text: "⚠️ failed.queue (DLQ)"
   Color: Red (#dc3545)
   ```

---

#### 🟢 **Layer 4: Worker Services** (GREEN)

**Email Service:**
```
Shape: Rectangle
Text: "Email Service
       Port: 3003
       ━━━━━━━━━━━━━━
       ◆ Circuit Breaker
       ↻ Retry System
       • Max 5 attempts
       • Exponential backoff
       ━━━━━━━━━━━━━━
       Sends via: SMTP"
Color: Green (#28a745)
Font: White
Position: Below email.queue
```

**Push Service:**
```
Shape: Rectangle (same as Email Service)
Text: "Push Service
       Port: 3004
       ━━━━━━━━━━━━━━
       ◆ Circuit Breaker
       ↻ Retry System
       • Max 5 attempts
       • Exponential backoff
       ━━━━━━━━━━━━━━
       Sends via: FCM"
Color: Green (#28a745)
Font: White
Position: Below push.queue
```

**Add arrows:**
- From email.queue → Email Service (solid)
- From push.queue → Push Service (solid)
- From Email Service → User Service (dashed)
- From Email Service → Template Service (dashed)
- From Email Service → API Gateway "Update Status" (dashed)
- Same for Push Service

---

#### 📮 **Layer 5: External Services** (GRAY)

**SMTP Server:**
```
Shape: Cloud or Rounded Rectangle
Text: "SMTP Server
       (Gmail/SendGrid)"
Color: Gray (#6c757d)
Position: Below Email Service
```

**FCM Server:**
```
Shape: Cloud or Rounded Rectangle
Text: "FCM Server
       (Firebase)"
Color: Gray (#6c757d)
Position: Below Push Service
```

---

#### 🗄️ **Layer 6: Databases** (PURPLE - BOTTOM)

Use **Cylinder** shape for databases:

1. **Gateway DB:**
   ```
   Text: "PostgreSQL
          api_gateway_db"
   Color: Purple (#6f42c1)
   ```

2. **User DB:**
   ```
   Text: "PostgreSQL
          user_service_db"
   Color: Purple (#6f42c1)
   ```

3. **Template DB:**
   ```
   Text: "PostgreSQL
          template_service_db"
   Color: Purple (#6f42c1)
   ```

4. **Redis Cache:**
   ```
   Shape: Cylinder
   Text: "Redis Cache
          Port: 6379
          ━━━━━━━━━━
          • User preferences
          • Rate limiting
          • Session cache"
   Color: Teal (#17a2b8)
   ```

---

### Step 4: Add Arrows & Labels

#### Arrow Types:
- **Solid arrow (→)**: Synchronous HTTP calls
- **Dashed arrow (⇢)**: Asynchronous messages
- **Double line (═)**: Database connections

#### Label Important Arrows:
- Client → Gateway: "HTTP POST"
- Gateway → User Service: "REST: Validate User"
- Gateway → Template: "REST: Get Template"
- Gateway → RabbitMQ: "Publish Message"
- Queue → Service: "Consume"
- Service → SMTP/FCM: "Send"
- Service → DLQ: "After 5 retries"

---

### Step 5: Add Legend (Bottom Right)

```
┌─────────────────────────┐
│        LEGEND           │
├─────────────────────────┤
│ →  HTTP/REST call       │
│ ⇢  Async message        │
│ ═  Database conn        │
│ ◆  Circuit breaker      │
│ ↻  Retry system         │
│ ⚠  Failure path         │
└─────────────────────────┘
```

---

### Step 6: Add Performance Metrics (Top Right)

```
┌─────────────────────────────┐
│   PERFORMANCE TARGETS       │
├─────────────────────────────┤
│ • 1,000+ notifications/min  │
│ • <100ms API response       │
│ • 99.5% delivery rate       │
│ • Horizontal scaling        │
└─────────────────────────────┘
```

---

### Step 7: Final Touches

1. **Align everything**: Select all → Arrange → Align → Distribute Horizontally/Vertically
2. **Add title**: "Distributed Notification System - Architecture"
3. **Add subtitle**: "Microservices | Message Queue | Circuit Breaker | Retry System"
4. **Add your team name**: "Team Storm"

---

### Step 8: Export

1. **File** → **Export as** → **PNG**
   - Quality: 300 DPI
   - Transparent: No
   - Save as: `SYSTEM_DESIGN_DIAGRAM.png`

2. **File** → **Export as** → **PDF**
   - Save as: `SYSTEM_DESIGN_DIAGRAM.pdf`

3. **File** → **Save as** → **Draw.io**
   - Save as: `SYSTEM_DESIGN_DIAGRAM.drawio`

---

## 🎨 Color Reference

| Component | Color Code | Color Name |
|-----------|------------|------------|
| API Gateway | #007bff | Blue |
| Services | #007bff | Blue |
| Workers | #28a745 | Green |
| RabbitMQ | #fd7e14 | Orange |
| Databases | #6f42c1 | Purple |
| Redis | #17a2b8 | Teal |
| External | #6c757d | Gray |
| DLQ | #dc3545 | Red |

---

## ✅ Checklist Before Exporting

- [ ] All 5 microservices shown
- [ ] RabbitMQ with 3 queues visible
- [ ] 3 PostgreSQL databases
- [ ] Redis cache
- [ ] SMTP and FCM external services
- [ ] Circuit breaker symbols (◆)
- [ ] Retry indicators (↻)
- [ ] Dead letter queue with red color
- [ ] Arrows show sync vs async
- [ ] Legend included
- [ ] Performance metrics box
- [ ] Team name
- [ ] Clean layout, not cluttered
- [ ] All text readable

---

## 📱 Quick Alternative: Use Mobile App

If on Mac:
1. Download Draw.io Desktop app
2. Or use Mermaid Live (easiest!)

---

## 🚀 FASTEST METHOD (Recommended):

1. Go to https://mermaid.live/
2. Copy content from `SYSTEM_DIAGRAM.mmd`
3. Paste and download PNG
4. **DONE in 2 minutes!** ✅

Then optionally:
- Open in Draw.io to add final touches
- Or use as-is (it's professional quality!)

---

**Time Estimates:**
- Mermaid Method: **2-5 minutes** ⚡
- Draw.io Manual: **15-20 minutes** 🎨
- Both for perfection: **25 minutes** 🌟
