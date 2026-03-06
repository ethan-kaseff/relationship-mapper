export default function HelpPage() {
  const sections = [
    { id: "getting-started", label: "Getting Started" },
    { id: "dashboard", label: "Dashboard" },
    { id: "people", label: "People" },
    { id: "partners", label: "Partners" },
    { id: "relationships", label: "Relationships" },
    { id: "interactions", label: "Interactions" },
    { id: "happenings", label: "Responses" },
    { id: "office-toggle", label: "Office Data Toggle" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-navy mb-6">Help &amp; User Guide</h1>

      {/* Table of Contents */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-navy mb-3">Table of Contents</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-[#2E75B6] hover:underline">
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-8">
        {/* Getting Started */}
        <section id="getting-started" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">1. Getting Started</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Logging in:</strong> Visit the application URL and sign in with the email and
              password provided by your administrator. After logging in you will land on the
              Dashboard.
            </p>
            <p>
              <strong>Navigation:</strong> Use the dark-blue navigation bar at the top of every page
              to move between sections. The links available depend on your role.
            </p>
            <div>
              <strong>Roles:</strong>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>
                  <strong>System Admin</strong> &mdash; Full access to all offices and settings.
                </li>
                <li>
                  <strong>Office Admin</strong> &mdash; Full access within your office, plus
                  Settings.
                </li>
                <li>
                  <strong>Office User</strong> &mdash; Can view and manage people, partners,
                  relationships, interactions, and responses within your office.
                </li>
                <li>
                  <strong>Connector</strong> &mdash; Limited access to the Dashboard and
                  Interactions only. Used for external contacts who log interactions through a
                  shared link.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">2. Dashboard</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              The Dashboard is your home screen. It gives you an at-a-glance summary of your
              office&rsquo;s data.
            </p>
            <div>
              <strong>Metric cards</strong> across the top show counts for:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>Total People</li>
                <li>Total Partners</li>
                <li>Total Relationships</li>
                <li>Recent Interactions</li>
              </ul>
            </div>
            <p>
              <strong>Partners without relationships:</strong> A list of partner organizations or
              persons that don&rsquo;t yet have any relationship connections. Use this to identify
              gaps.
            </p>
            <p>
              <strong>Recent interactions:</strong> The latest logged interactions appear here so you
              can quickly see recent activity.
            </p>
            <p>
              <strong>Priority filter:</strong> Filter the dashboard to show only partners at a
              specific priority level (High, Medium, Low).
            </p>
          </div>
        </section>

        {/* People */}
        <section id="people" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">3. People</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              The People page lists all individuals tracked in the system. These are the staff and
              contacts at your organization.
            </p>
            <p>
              <strong>Adding a person:</strong> Click <em>Add Person</em> and fill in the
              name, email, and other details. You can mark a person as a <strong>Connector</strong>{" "}
              if they serve as a liaison for external interactions.
            </p>
            <p>
              <strong>Editing:</strong> Click on a person&rsquo;s name to view their detail page.
              From there you can edit their information inline by clicking the field you want to
              change.
            </p>
            <p>
              <strong>Search:</strong> Use the search bar at the top of the People list to quickly
              find someone by name.
            </p>
            <p>
              <strong>Connector flag:</strong> When a person is marked as a Connector, they can
              receive a special link to log interactions without needing full system access.
            </p>
          </div>
        </section>

        {/* Partners */}
        <section id="partners" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">4. Partners</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Partners represent the organizations or individual persons your office has
              relationships with.
            </p>
            <div>
              <strong>Types:</strong>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>
                  <strong>Organization</strong> &mdash; A company, agency, nonprofit, etc.
                </li>
                <li>
                  <strong>Person</strong> &mdash; An individual contact who isn&rsquo;t part of a
                  larger organization.
                </li>
              </ul>
            </div>
            <div>
              <strong>Priority levels:</strong> Each partner can be assigned a priority:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>
                  <strong>High</strong> &mdash; Key strategic partners.
                </li>
                <li>
                  <strong>Medium</strong> &mdash; Important but not top priority.
                </li>
                <li>
                  <strong>Low</strong> &mdash; Casual or infrequent relationships.
                </li>
              </ul>
            </div>
            <p>
              <strong>Managing roles:</strong> On a partner&rsquo;s detail page you can add roles
              (e.g., &ldquo;Board Member,&rdquo; &ldquo;Donor,&rdquo; &ldquo;Volunteer&rdquo;) that
              describe the nature of the connection.
            </p>
            <p>
              <strong>Adding a partner:</strong> Click <em>Add Partner</em>, choose the type
              (Organization or Person), enter the name and optional details, and set the priority
              level.
            </p>
          </div>
        </section>

        {/* Relationships */}
        <section id="relationships" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">5. Relationships</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Relationships connect a <strong>Person</strong> from your organization to a{" "}
              <strong>Partner</strong> through a specific <strong>Role</strong>. For example:
              &ldquo;Jane Smith &rarr; Board Member &rarr; ABC Foundation.&rdquo;
            </p>
            <p>
              <strong>Creating a relationship:</strong> Click <em>Add Relationship</em>, then select
              the person, the partner, and the role that describes the connection.
            </p>
            <p>
              <strong>Viewing:</strong> The Relationships page shows all connections in a table. You
              can see who is connected to which partner and in what capacity.
            </p>
            <p>
              <strong>Role history:</strong> When a person&rsquo;s role at a partner changes, the
              system tracks the history so you can see past assignments.
            </p>
          </div>
        </section>

        {/* Interactions */}
        <section id="interactions" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">6. Interactions</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Interactions are records of meetings, calls, emails, or other touchpoints with a
              partner.
            </p>
            <p>
              <strong>Logging an interaction:</strong> Click <em>Add Interaction</em>, select the
              partner, choose the type of interaction, enter the date, and add notes about what was
              discussed.
            </p>
            <p>
              <strong>Connector public links:</strong> Connectors can log interactions through a
              special public link without logging into the full application. Admins generate this
              link from the person&rsquo;s detail page.
            </p>
            <p>
              <strong>Viewing history:</strong> All interactions are listed in reverse chronological
              order. You can filter or search to find specific entries.
            </p>
          </div>
        </section>

        {/* Happenings */}
        <section id="happenings" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">7. Responses</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Responses let you track happenings in the world and record any public responses from
              people in your network.
            </p>
            <p>
              <strong>Creating a happening:</strong> Click <em>Add Happening</em>, enter the date, time,
              and description.
            </p>
            <p>
              <strong>Tracking responses:</strong> After creating a happening, you can record responses
              from people &mdash; what they said publicly or how they reacted.
            </p>
          </div>
        </section>

        {/* Office Toggle */}
        <section id="office-toggle" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">8. Office Data Toggle</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              If your account has access to multiple offices, you will see a toggle button in the
              navigation bar that switches between <strong>My Office</strong> and{" "}
              <strong>All Offices</strong>.
            </p>
            <p>
              <strong>My Office:</strong> Shows only data belonging to your assigned office.
            </p>
            <p>
              <strong>All Offices:</strong> Shows data across all offices you have permission to
              view. System Admins always see all offices.
            </p>
            <p>
              The toggle affects every page &mdash; Dashboard metrics, People, Partners,
              Relationships, Interactions, and Responses will all reflect the selected scope.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-8 mb-4 text-center text-xs text-gray-400">
        Need more help? Contact your system administrator.
      </div>
    </div>
  );
}
