import {
  BookOpen,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  Shield,
  BookMarked
} from 'lucide-react';

export function GuidelineTab() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-brand-terracotta to-brand-orange rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-3xl font-bold">System Guidelines</h1>
        </div>
        <p className="text-white text-opacity-90 text-lg">
          A comprehensive guide to understanding and using the Journey Management Platform
        </p>
      </div>

      <Section
        icon={<BookMarked className="w-6 h-6" />}
        title="1. System Purpose"
        color="bg-blue-50 border-blue-200"
      >
        <p className="text-slate-700 leading-relaxed">
          This Journey Management Platform is designed to streamline the entire lifecycle of journey planning,
          booking coordination, team management, and logistics execution. It serves as a centralized hub where:
        </p>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Administrators can build comprehensive itineraries with detailed daily activities</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Teams can coordinate bookings with suppliers and track payment statuses</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Staff assignments and roles are clearly defined for each journey</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <span>Transportation and logistics are organized and monitored</span>
          </li>
        </ul>
      </Section>

      <Section
        icon={<Layers className="w-6 h-6" />}
        title="2. Platform Structure Overview"
        color="bg-purple-50 border-purple-200"
      >
        <div className="space-y-4">
          <TabDescription
            name="Itinerary"
            description="The primary source of truth for all journey data. Build your journey day-by-day, add activities, dining, accommodations, and detailed notes. All other tabs depend on the data entered here."
            importance="Primary Data Source"
            color="text-blue-600"
          />
          <TabDescription
            name="Bookings"
            description="Manage all supplier reservations, track booking statuses, confirmation numbers, payment states, and coordinate with vendors. View booking fees and coverage across all activities."
            importance="Depends on Itinerary"
            color="text-amber-600"
          />
          <TabDescription
            name="Staff"
            description="Assign team members to journeys, define roles (guides, drivers, specialists), manage staff availability, and track who is assigned to each day or activity."
            importance="Depends on Itinerary"
            color="text-green-600"
          />
          <TabDescription
            name="Transportation"
            description="Coordinate transportation requirements, vehicle assignments, driver schedules, and equipment needs. Ensure all logistics are in place before journey execution."
            importance="Depends on Itinerary"
            color="text-indigo-600"
          />
        </div>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
          <p className="text-sm text-yellow-900 font-medium flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Important: Always complete the Itinerary tab first. Other tabs pull their data from the itinerary structure.</span>
          </p>
        </div>
      </Section>

      <Section
        icon={<ListChecks className="w-6 h-6" />}
        title="3. Step-by-Step Workflow"
        color="bg-green-50 border-green-200"
      >
        <div className="space-y-3">
          <WorkflowStep
            number={1}
            title="Build the Itinerary"
            description="Create days, add activities, dining, and accommodations. Include all details like times, locations, and special notes."
          />
          <WorkflowStep
            number={2}
            title="Complete Bookings"
            description="Navigate to the Bookings tab and confirm all supplier reservations. Add confirmation numbers, track payment statuses, and ensure all fees are recorded."
          />
          <WorkflowStep
            number={3}
            title="Assign Staff"
            description="Go to the Staff tab and assign guides, drivers, and specialists to the journey. Ensure adequate coverage for each day and activity."
          />
          <WorkflowStep
            number={4}
            title="Confirm Transportation"
            description="Open the Transportation tab and verify vehicle assignments, driver schedules, equipment availability, and transportation coverage."
          />
          <WorkflowStep
            number={5}
            title="Review Completion Statuses"
            description="Check all tabs for completion indicators. Ensure no pending items or missing information remain."
          />
          <WorkflowStep
            number={6}
            title="Journey Ready for Execution"
            description="Once all statuses show complete and all details are confirmed, the journey is ready. Share relevant information with staff and begin execution."
          />
        </div>
      </Section>

      <Section
        icon={<CheckCircle2 className="w-6 h-6" />}
        title="4. Status & Icons Explanation"
        color="bg-slate-50 border-slate-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusIndicator
            icon={<CheckCircle2 className="w-6 h-6 text-green-600" />}
            label="Confirmed / Completed"
            description="Item is fully confirmed and payment has been made or activity is completed"
          />
          <StatusIndicator
            icon={<AlertCircle className="w-6 h-6 text-amber-600" />}
            label="Pending / Attention Needed"
            description="Item requires action, follow-up, or confirmation from suppliers"
          />
          <StatusIndicator
            icon={<XCircle className="w-6 h-6 text-red-600" />}
            label="Missing / Not Completed"
            description="Required information is missing or booking has not been made"
          />
          <StatusIndicator
            icon={<RefreshCw className="w-6 h-6 text-blue-600" />}
            label="Replacement Needed"
            description="Original booking cancelled or changed; replacement or alternative required"
          />
        </div>
      </Section>

      <Section
        icon={<Shield className="w-6 h-6" />}
        title="5. Completion Logic"
        color="bg-teal-50 border-teal-200"
      >
        <p className="text-slate-700 leading-relaxed mb-4">
          Each tab uses intelligent completion tracking to help you understand progress at a glance:
        </p>
        <ul className="space-y-3 text-slate-700">
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-slate-900">Itinerary:</strong> Marked complete when all days have activities,
              accommodations, and dining entries with necessary details filled in.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 bg-amber-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-slate-900">Bookings:</strong> Complete when all activities have confirmed
              booking statuses, confirmation numbers recorded, and payment status is marked as paid or confirmed.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-slate-900">Staff:</strong> Complete when all required roles are assigned
              for the entire journey duration with no gaps in coverage.
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-slate-900">Transportation:</strong> Complete when all transportation needs are
              met, vehicles assigned, drivers confirmed, and equipment requirements satisfied.
            </div>
          </li>
        </ul>
      </Section>

      <Section
        icon={<Lightbulb className="w-6 h-6" />}
        title="6. Best Practices"
        color="bg-amber-50 border-amber-200"
      >
        <ul className="space-y-3 text-slate-700">
          <BestPractice
            text="Always start with the Itinerary tab and build it completely before moving to other tabs"
          />
          <BestPractice
            text="Avoid duplicating information across tabs - enter data once in the Itinerary and reference it elsewhere"
          />
          <BestPractice
            text="Update booking and payment statuses immediately after receiving confirmation from suppliers"
          />
          <BestPractice
            text="Use the notes fields liberally to document exceptions, special requests, or important context"
          />
          <BestPractice
            text="Review completion statuses regularly throughout the planning process to catch gaps early"
          />
          <BestPractice
            text="Share journey details with staff well in advance using the sharing features"
          />
          <BestPractice
            text="Keep contact information up-to-date for all suppliers, staff, and emergency contacts"
          />
          <BestPractice
            text="Export journey details to PDF or Excel for offline reference during journey execution"
          />
        </ul>
      </Section>

      <Section
        icon={<AlertTriangle className="w-6 h-6" />}
        title="7. Common Mistakes to Avoid"
        color="bg-red-50 border-red-200"
      >
        <ul className="space-y-3 text-slate-700">
          <CommonMistake
            text="Incomplete itinerary details: Missing times, locations, or contact information can cause confusion during execution"
          />
          <CommonMistake
            text="Marking items as confirmed without actual payment or supplier confirmation"
          />
          <CommonMistake
            text="Missing backup transportation or contingency plans for critical activities"
          />
          <CommonMistake
            text="Unassigned staff for specific days or activities, creating coverage gaps"
          />
          <CommonMistake
            text="Forgetting to update statuses when changes occur or bookings are modified"
          />
          <CommonMistake
            text="Not documenting special requirements, dietary restrictions, or accessibility needs"
          />
          <CommonMistake
            text="Ignoring the timeline view which can reveal scheduling conflicts or timing issues"
          />
          <CommonMistake
            text="Failing to verify supplier contact information before the journey starts"
          />
        </ul>
      </Section>

      <Section
        icon={<Shield className="w-6 h-6" />}
        title="8. Roles & Access Control"
        color="bg-indigo-50 border-indigo-200"
      >
        <p className="text-slate-700 leading-relaxed mb-4">
          The platform supports two user roles with different levels of access:
        </p>
        <div className="space-y-3">
          <RoleDescription
            role="Admin"
            description="Full access to all features. Can create, edit, and delete all journeys. Can manage users, approve new accounts, create templates, and share journeys with guides."
            color="text-red-600"
          />
          <RoleDescription
            role="Guide"
            description="Read-only access to journeys shared with them by admins. Can view itineraries, upload documents, and create personal guide copies. Guide copies can be edited freely without affecting the original journey."
            color="text-green-600"
          />
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Administrators can share specific journeys with guides. Guides receive read-only access to shared journeys and can create editable personal copies (guide copies) for their own reference and notes.
          </p>
        </div>
      </Section>

      <Section
        icon={<BookOpen className="w-6 h-6" />}
        title="9. Glossary of Terms"
        color="bg-gray-50 border-gray-200"
      >
        <div className="space-y-3">
          <GlossaryTerm
            term="Itinerary"
            definition="The day-by-day schedule of a journey including all activities, dining, accommodations, and transportation."
          />
          <GlossaryTerm
            term="Booking"
            definition="A confirmed reservation with a supplier for activities, accommodations, dining, or transportation."
          />
          <GlossaryTerm
            term="Coverage"
            definition="The extent to which all required items (bookings, staff, transportation) are confirmed and assigned."
          />
          <GlossaryTerm
            term="Completion Status"
            definition="An indicator showing whether all required information and confirmations are in place for a tab or section."
          />
          <GlossaryTerm
            term="JourneyTemplate"
            definition="A reusable journey structure that can be used as a starting point for new journeys with similar itineraries."
          />
          <GlossaryTerm
            term="Day Number"
            definition="The sequential number of each day in the journey, starting from Day 1."
          />
          <GlossaryTerm
            term="Booking Status"
            definition="The current state of a booking: pending, confirmed, cancelled, or requires replacement."
          />
          <GlossaryTerm
            term="Staff Assignment"
            definition="The allocation of team members (guides, drivers, specialists) to specific journeys or days."
          />
          <GlossaryTerm
            term="Logistics"
            definition="The coordination of transportation, vehicles, drivers, equipment, and other operational requirements."
          />
          <GlossaryTerm
            term="Guide Copy"
            definition="A read-only version of a journey shared with guides containing relevant information for journey execution."
          />
        </div>
      </Section>

      <div className="bg-gradient-to-r from-brand-cyan to-brand-terracotta rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-2">Need Help?</h3>
            <p className="text-white text-opacity-90">
              If you have questions not covered in this guide, contact your system administrator or
              refer to the platform documentation. Remember: the Itinerary is always your starting point!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  color,
  children
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${color} border rounded-xl p-6 shadow-sm`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-slate-700">{icon}</div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TabDescription({
  name,
  description,
  importance,
  color
}: {
  name: string;
  description: string;
  importance: string;
  color: string;
}) {
  return (
    <div className="border-l-4 pl-4 py-2" style={{ borderColor: color.replace('text-', '') }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-slate-900">{name}</h3>
        <span className={`text-xs font-semibold ${color} bg-white px-2 py-1 rounded`}>
          {importance}
        </span>
      </div>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function StatusIndicator({
  icon,
  label,
  description
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-slate-900 mb-1">{label}</h4>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function BestPractice({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function CommonMistake({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function RoleDescription({
  role,
  description,
  color
}: {
  role: string;
  description: string;
  color: string;
}) {
  return (
    <div className="p-3 bg-white rounded-lg border border-slate-200">
      <h4 className={`font-bold ${color} mb-1`}>{role}</h4>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

function GlossaryTerm({
  term,
  definition
}: {
  term: string;
  definition: string;
}) {
  return (
    <div className="pl-4 border-l-2 border-slate-300">
      <dt className="font-bold text-slate-900">{term}</dt>
      <dd className="text-sm text-slate-600 mt-1">{definition}</dd>
    </div>
  );
}
