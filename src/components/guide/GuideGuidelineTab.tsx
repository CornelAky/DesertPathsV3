import {
  BookOpen,
  CheckSquare,
  Map,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  Shield,
  Phone,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';

export function GuideGuidelineTab() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-brand-terracotta to-brand-orange rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Guide Handbook</h1>
        </div>
        <p className="text-white text-opacity-90">
          Your essential guide to leading exceptional journeys
        </p>
      </div>

      <Section
        icon={<BookOpen className="w-5 h-5" />}
        title="1. Welcome"
        color="bg-blue-50 border-blue-200"
      >
        <p className="text-slate-700 leading-relaxed">
          Welcome! As a guide, you are the face of the company and the primary contact for our guests throughout their journey.
          This page is your main reference during the trip. Everything you need to know about the itinerary, activities,
          accommodations, and logistics is here.
        </p>
        <div className="mt-3 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            Your success is our success. Use this guideline to deliver memorable experiences and handle any situation with confidence.
          </p>
        </div>
      </Section>

      <Section
        icon={<CheckSquare className="w-5 h-5" />}
        title="2. Guide Responsibilities"
        color="bg-green-50 border-green-200"
      >
        <p className="text-slate-700 leading-relaxed mb-3">
          As the guide, your core responsibilities include:
        </p>
        <div className="space-y-2">
          <Responsibility text="Leading the group and ensuring a positive experience for all guests" />
          <Responsibility text="Following the itinerary closely and keeping activities on schedule" />
          <Responsibility text="Coordinating with the driver regarding timing, routes, and stops" />
          <Responsibility text="Ensuring guest safety at all times and identifying potential hazards" />
          <Responsibility text="Communicating clearly with guests about the day's plan and expectations" />
          <Responsibility text="Managing guest expectations and addressing concerns professionally" />
          <Responsibility text="Conducting headcounts before departing each location" />
          <Responsibility text="Reporting issues, delays, or incidents to operations immediately" />
          <Responsibility text="Representing the company with professionalism and cultural sensitivity" />
        </div>
      </Section>

      <Section
        icon={<Map className="w-5 h-5" />}
        title="3. How to Read the Itinerary"
        color="bg-purple-50 border-purple-200"
      >
        <p className="text-slate-700 leading-relaxed mb-4">
          The itinerary is organized by days. Each day shows:
        </p>

        <div className="space-y-3">
          <ItineraryElement
            label="Day Number & Date"
            description="The sequential day and calendar date for easy reference"
          />
          <ItineraryElement
            label="City/Destination"
            description="The primary location for that day"
          />
          <ItineraryElement
            label="Activities"
            description="All scheduled activities with names, descriptions, times, and locations. Check for special notes or requirements."
          />
          <ItineraryElement
            label="Dining"
            description="Breakfast, lunch, and dinner arrangements including restaurant names, reservation times, and locations"
          />
          <ItineraryElement
            label="Accommodations"
            description="Hotel details including check-in/check-out times, addresses, contact numbers, and access instructions"
          />
          <ItineraryElement
            label="Transportation"
            description="Vehicle type, driver information, and special transportation notes"
          />
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
          <p className="text-sm text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>Always review the next day's itinerary the night before</strong> to prepare and anticipate any special requirements.</span>
          </p>
        </div>
      </Section>

      <Section
        icon={<ListChecks className="w-5 h-5" />}
        title="4. Daily Checklist"
        color="bg-teal-50 border-teal-200"
      >
        <p className="text-slate-700 leading-relaxed mb-3">
          Complete these tasks each day for smooth operations:
        </p>

        <div className="bg-white rounded-lg p-4 space-y-3 border border-teal-300">
          <ChecklistSection title="Morning Routine">
            <ChecklistItem text="Review today's full itinerary including all timing and locations" />
            <ChecklistItem text="Check weather conditions and adjust plans if needed" />
            <ChecklistItem text="Confirm transportation arrival time with driver" />
            <ChecklistItem text="Verify all activity bookings and reservations are confirmed" />
            <ChecklistItem text="Prepare necessary equipment, tickets, or materials" />
          </ChecklistSection>

          <ChecklistSection title="Before Departure">
            <ChecklistItem text="Complete guest headcount" />
            <ChecklistItem text="Ensure everyone has necessary items (water, sunscreen, etc.)" />
            <ChecklistItem text="Brief guests on the day's schedule and expectations" />
            <ChecklistItem text="Check vehicle is ready and suitable for the group size" />
          </ChecklistSection>

          <ChecklistSection title="During Activities">
            <ChecklistItem text="Monitor group safety and comfort continuously" />
            <ChecklistItem text="Keep track of time to maintain schedule" />
            <ChecklistItem text="Take photos or assist guests with photo opportunities" />
            <ChecklistItem text="Provide context, history, and interesting information" />
          </ChecklistSection>

          <ChecklistSection title="End of Day">
            <ChecklistItem text="Ensure all guests return to accommodation safely" />
            <ChecklistItem text="Verify check-in procedures are complete" />
            <ChecklistItem text="Brief guests on next day's departure time and meeting point" />
            <ChecklistItem text="Report any incidents or issues to operations" />
            <ChecklistItem text="Review next day's itinerary and prepare" />
          </ChecklistSection>
        </div>
      </Section>

      <Section
        icon={<CheckCircle2 className="w-5 h-5" />}
        title="5. Status Indicators"
        color="bg-slate-50 border-slate-200"
      >
        <p className="text-slate-700 leading-relaxed mb-3">
          Throughout the itinerary, you'll see status icons indicating booking and confirmation states:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <StatusCard
            icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
            label="Confirmed"
            description="Booking is confirmed and paid. Proceed as planned."
          />
          <StatusCard
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
            label="Pending"
            description="Waiting for confirmation. Contact operations if needed during the journey."
          />
          <StatusCard
            icon={<XCircle className="w-5 h-5 text-red-600" />}
            label="Not Confirmed"
            description="Booking not complete. Do not proceed without checking with operations first."
          />
          <StatusCard
            icon={<Shield className="w-5 h-5 text-blue-600" />}
            label="Backup Available"
            description="Alternative option is ready if primary booking fails."
          />
        </div>
      </Section>

      <Section
        icon={<MessageCircle className="w-5 h-5" />}
        title="6. Communication Guidelines"
        color="bg-indigo-50 border-indigo-200"
      >
        <p className="text-slate-700 leading-relaxed mb-4">
          Clear communication is essential. Here's when and how to communicate:
        </p>

        <CommunicationGuideline
          recipient="Operations / Management"
          when="Immediately report any emergencies, major delays, booking issues, guest complaints, or safety concerns. Provide daily end-of-day updates if requested."
          how="Use primary contact number. Send photos or location if relevant."
        />

        <CommunicationGuideline
          recipient="Driver"
          when="Coordinate pickup times, route changes, stops, and guest needs. Confirm next day's departure the night before."
          how="Direct communication via phone or in person. Keep it clear and respectful."
        />

        <CommunicationGuideline
          recipient="Suppliers (Hotels, Restaurants, Activities)"
          when="Confirm arrival times, group size, special requests, or resolve booking issues on-site."
          how="Professional and courteous. Always have confirmation numbers ready."
        />

        <CommunicationGuideline
          recipient="Guests"
          when="Daily briefings, safety instructions, schedule updates, and answering questions. Be approachable and attentive."
          how="Clear, friendly, and confident tone. Repeat important information."
        />

        <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-sm text-red-900 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Never ignore or delay reporting serious issues. Always escalate immediately.</span>
          </p>
        </div>
      </Section>

      <Section
        icon={<ThumbsUp className="w-5 h-5" />}
        title="7. Do's and Don'ts"
        color="bg-amber-50 border-amber-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              <ThumbsUp className="w-5 h-5" />
              DO
            </h4>
            <ul className="space-y-2">
              <DoItem text="Arrive early and be prepared" />
              <DoItem text="Maintain professionalism at all times" />
              <DoItem text="Stay flexible and adapt to changes" />
              <DoItem text="Keep guests informed proactively" />
              <DoItem text="Show enthusiasm and positivity" />
              <DoItem text="Respect local customs and culture" />
              <DoItem text="Document issues with photos when appropriate" />
              <DoItem text="Prioritize safety over schedule" />
              <DoItem text="Listen to guest feedback" />
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
              <ThumbsDown className="w-5 h-5" />
              DON'T
            </h4>
            <ul className="space-y-2">
              <DontItem text="Leave guests unattended in unfamiliar areas" />
              <DontItem text="Make promises you cannot keep" />
              <DontItem text="Argue with guests or suppliers publicly" />
              <DontItem text="Share personal problems with guests" />
              <DontItem text="Use phone excessively during activities" />
              <DontItem text="Deviate from itinerary without approval" />
              <DontItem text="Ignore safety protocols" />
              <DontItem text="Discuss financial or internal matters with guests" />
              <DontItem text="Consume alcohol while on duty" />
            </ul>
          </div>
        </div>
      </Section>

      <Section
        icon={<Phone className="w-5 h-5" />}
        title="8. Emergency & Escalation"
        color="bg-red-50 border-red-300"
      >
        <div className="space-y-4">
          <div className="bg-red-100 rounded-lg p-4 border-l-4 border-red-600">
            <h4 className="font-bold text-red-900 mb-2">Emergency Priorities</h4>
            <ol className="space-y-2 text-sm text-red-900">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span><strong>Ensure immediate safety</strong> - Remove guests from danger</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span><strong>Call emergency services</strong> - If medical or security emergency (Police, Ambulance)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span><strong>Contact operations immediately</strong> - Report situation and get instructions</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span><strong>Stay with guests</strong> - Provide reassurance and support</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                <span><strong>Document everything</strong> - Photos, names, times, locations</span>
              </li>
            </ol>
          </div>

          <EmergencyContact
            type="Operations Manager"
            number="[Contact Number - To Be Configured]"
            availability="24/7 Emergency Hotline"
          />

          <EmergencyContact
            type="Local Emergency Services"
            number="Police / Ambulance"
            availability="Call appropriate local emergency number"
          />

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-300">
            <h4 className="font-semibold text-amber-900 mb-2">Situations Requiring Immediate Escalation:</h4>
            <ul className="space-y-1 text-sm text-amber-900">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Medical emergencies or injuries</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Guest accidents or safety incidents</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Vehicle breakdown or transportation failure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Missing guests or security concerns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Major booking errors (double booking, no reservation)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Natural disasters or severe weather</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Guest complaints about misconduct or harassment</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      <Section
        icon={<HelpCircle className="w-5 h-5" />}
        title="9. Frequently Asked Questions"
        color="bg-gray-50 border-gray-200"
      >
        <div className="space-y-4">
          <FAQ
            question="What if a guest wants to skip an activity?"
            answer="Respect their choice. Ensure they know the meeting point and time for the next activity. Inform them of any safety concerns if they're on their own. Report the change to operations if it affects bookings."
          />

          <FAQ
            question="What if we're running late?"
            answer="Assess the delay and inform the next destination immediately. Contact operations if the delay is significant (more than 30 minutes). Adjust the schedule in consultation with operations and keep guests informed."
          />

          <FAQ
            question="What if the weather is bad?"
            answer="Prioritize safety. If an outdoor activity is dangerous, contact operations immediately for alternatives. Have backup indoor options when possible. Keep guests informed and maintain a positive attitude."
          />

          <FAQ
            question="What if a booking is not found at a restaurant or hotel?"
            answer="Stay calm and professional. Show confirmation numbers and emails. Contact operations immediately for verification. Do not argue with staff. Operations will resolve the issue or provide alternatives."
          />

          <FAQ
            question="What if there's a conflict between guests?"
            answer="Address it privately and professionally. Listen to both sides. Mediate fairly and respectfully. If the conflict escalates or impacts the group, report to operations immediately."
          />

          <FAQ
            question="Can I change the itinerary if guests request it?"
            answer="Minor adjustments (timing, photo stops) are okay if they don't affect bookings. Major changes require operations approval. Never skip paid activities or bookings without authorization."
          />

          <FAQ
            question="What should I do if I feel unwell during the journey?"
            answer="Inform operations immediately. Do not try to push through if it compromises guest safety or experience. Operations will arrange backup support or medical assistance if needed."
          />

          <FAQ
            question="How do I handle tips from guests?"
            answer="Follow company policy. Be gracious but never solicit tips. If guests ask about tipping norms, provide honest guidance without pressure."
          />
        </div>
      </Section>

      <div className="bg-gradient-to-r from-brand-cyan to-brand-terracotta rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg mb-2">Remember</h3>
            <p className="text-white text-opacity-95 text-sm leading-relaxed">
              You are the guardian of the guest experience. Your professionalism, knowledge, and care make every journey memorable.
              When in doubt, communicate. When there's a problem, escalate. When there's an opportunity to exceed expectations, take it.
              Safe travels!
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
    <div className={`${color} border rounded-xl p-5 shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-slate-700">{icon}</div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Responsibility({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-lg p-2 border border-green-200">
      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}

function ItineraryElement({
  label,
  description
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-purple-200">
      <h4 className="font-semibold text-purple-900 text-sm mb-1">{label}</h4>
      <p className="text-xs text-slate-600">{description}</p>
    </div>
  );
}

function ChecklistSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-teal-900 text-sm mb-2">{title}</h4>
      <div className="space-y-1.5 pl-1">
        {children}
      </div>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-4 h-4 border-2 border-teal-600 rounded flex-shrink-0 mt-0.5"></div>
      <span className="text-xs text-slate-700">{text}</span>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  description
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex gap-2 p-3 bg-white rounded-lg border border-slate-200">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm mb-1">{label}</h4>
        <p className="text-xs text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function CommunicationGuideline({
  recipient,
  when,
  how
}: {
  recipient: string;
  when: string;
  how: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-indigo-200 mb-3">
      <h4 className="font-semibold text-indigo-900 text-sm mb-2">{recipient}</h4>
      <div className="space-y-1 text-xs text-slate-700">
        <p><strong className="text-slate-900">When:</strong> {when}</p>
        <p><strong className="text-slate-900">How:</strong> {how}</p>
      </div>
    </div>
  );
}

function DoItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function DontItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}

function EmergencyContact({
  type,
  number,
  availability
}: {
  type: string;
  number: string;
  availability: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border-l-4 border-red-600">
      <h4 className="font-bold text-slate-900 text-sm">{type}</h4>
      <p className="text-lg font-mono text-red-700 my-1">{number}</p>
      <p className="text-xs text-slate-600">{availability}</p>
    </div>
  );
}

function FAQ({
  question,
  answer
}: {
  question: string;
  answer: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <h4 className="font-semibold text-slate-900 text-sm mb-1.5">{question}</h4>
      <p className="text-xs text-slate-600 leading-relaxed">{answer}</p>
    </div>
  );
}
