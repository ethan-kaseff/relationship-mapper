export default function HelpPage() {
  const sections = [
    { id: "getting-started", label: "Getting Started" },
    { id: "dashboard", label: "Dashboard" },
    { id: "people", label: "People" },
    { id: "partners", label: "Partners" },
    { id: "relationships", label: "Relationships" },
    { id: "interactions", label: "Interactions" },
    { id: "happenings", label: "Responses" },
    { id: "events", label: "Events" },
    { id: "fundraisers", label: "Fundraisers" },
    { id: "public-donation", label: "Public Donation Pages" },
    { id: "integrations", label: "Integrations (Stripe, QuickBooks, Constant Contact)" },
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
                  relationships, interactions, responses, events, and fundraisers within your office.
                </li>
                <li>
                  <strong>Viewer</strong> &mdash; Read-only access to People, Partners,
                  Relationships, Interactions, and Responses. Cannot access Events, Fundraisers, or
                  Settings.
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

        {/* Events */}
        <section id="events" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">8. Events</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Events let you plan gatherings, track invitations and RSVPs, manage seating
              arrangements, and handle meal selections.
            </p>
            <p>
              <strong>Creating an event:</strong> Click <em>New Event</em> from the Events page.
              Enter a title, date, time, and location. You can optionally copy a floor plan from a
              previous event using the <em>Floor Plan Template</em> dropdown, and auto-invite
              people from an Annual Event Type.
            </p>
            <div>
              <strong>Tracking options:</strong> When creating an event you can enable or disable:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li><strong>Assigned seating</strong> &mdash; Manage a floor plan with tables and seat assignments.</li>
                <li><strong>Meal selection</strong> &mdash; Track meal choices and dietary needs per guest.</li>
              </ul>
            </div>
            <p>
              <strong>Invite management:</strong> On the event detail page, add guests from your
              People list. Track their RSVP status (Pending, Yes, No, Maybe), assign them to groups,
              and manage their table and seat assignments.
            </p>
            <p>
              <strong>Seating chart:</strong> If assigned seating is enabled, use the interactive
              floor plan to drag tables, resize them, and assign guests to specific seats.
            </p>
            <p>
              <strong>Ticket pricing:</strong> You can set a ticket price for an event. When an
              event has a ticket price and is linked to a fundraiser, ticket purchases are processed
              through Stripe and recorded as donations to that fundraiser.
            </p>
            <p>
              <strong>Constant Contact sync:</strong> If Constant Contact is connected (see
              Integrations below), you can sync your event invite list as an email contact list for
              marketing purposes.
            </p>
          </div>
        </section>

        {/* Fundraisers */}
        <section id="fundraisers" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">9. Fundraisers</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Fundraisers let you create donation campaigns, track progress toward a goal, accept
              online payments through Stripe, and sync donation records to QuickBooks.
            </p>

            <div>
              <strong>Creating a fundraiser:</strong> Click <em>New Fundraiser</em> from the
              Fundraisers page and fill in:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li><strong>Title</strong> &mdash; The name of the campaign.</li>
                <li><strong>URL Slug</strong> &mdash; A short, URL-friendly identifier used for the
                  public donation page (e.g., <code>/donate/spring-gala</code>). Auto-generated from
                  the title but can be customized.</li>
                <li><strong>Goal Amount</strong> &mdash; The fundraising target in dollars.</li>
                <li><strong>Preset Donation Amounts</strong> &mdash; Comma-separated dollar values
                  shown as quick-select buttons on the public donation page (default: $25, $50,
                  $100).</li>
                <li><strong>Start/End Date</strong> &mdash; Optional date range for the campaign.</li>
                <li><strong>Description</strong> &mdash; Shown on the public donation page.</li>
                <li><strong>Link to Event</strong> &mdash; Optionally associate the fundraiser with
                  an event.</li>
              </ul>
            </div>

            <p>
              <strong>Fundraiser list:</strong> The main Fundraisers page shows all campaigns as
              cards with a progress bar, amount raised, goal, donation count, and percentage funded.
              Each card shows whether the fundraiser is Active or Inactive.
            </p>

            <div>
              <strong>Fundraiser detail page:</strong> Click any fundraiser to see its detail page
              with four tabs:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>
                  <strong>Overview</strong> &mdash; Progress bar, key stats (amount raised, goal,
                  donation count), campaign details, public donation link, and the five most recent
                  donations.
                </li>
                <li>
                  <strong>Donations</strong> &mdash; A full table of all donations showing donor
                  name, amount, payment method (Stripe, cash, check, other), approval status, QB
                  sync status, and date. Use <em>Add Manual Donation</em> to record offline
                  donations (cash, check, etc.). Use <em>Sync All to QB</em> to batch-sync
                  unsynced donations to QuickBooks.
                </li>
                <li>
                  <strong>Approvals</strong> &mdash; Shows donations from unknown donors that need
                  review. When a donor cannot be automatically matched to a person in the system
                  (by email), the donation is marked as Pending. You can <em>Approve</em> or{" "}
                  <em>Reject</em> each pending donation. The tab badge shows how many donations are
                  awaiting approval.
                </li>
                <li>
                  <strong>Settings</strong> &mdash; Toggle the fundraiser between Active and
                  Inactive, view the public donation link, and delete the fundraiser. Deleting a
                  fundraiser permanently removes all associated donation records.
                </li>
              </ul>
            </div>

            <div>
              <strong>Adding a manual donation:</strong> On the Donations tab, click{" "}
              <em>Add Manual Donation</em> and enter:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>Donor Name (optional)</li>
                <li>Email (optional)</li>
                <li>Amount in dollars</li>
                <li>Payment method (Cash, Check, or Other)</li>
                <li>Notes (optional)</li>
              </ul>
              Manual donations without a matched person go to the Approvals queue.
            </div>

            <div>
              <strong>Donation statuses:</strong>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li><strong>Approved</strong> (green) &mdash; Matched to a known person or manually
                  approved.</li>
                <li><strong>Pending</strong> (yellow) &mdash; From an unknown donor, waiting for
                  review.</li>
                <li><strong>Rejected</strong> (red) &mdash; Manually rejected by an admin.</li>
              </ul>
            </div>

            <div>
              <strong>QuickBooks sync status:</strong> Each donation row shows a QB column:
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li><strong>Synced</strong> (green) &mdash; Successfully created as a Sales Receipt
                  in QuickBooks.</li>
                <li><strong>Sync</strong> (gray button) &mdash; Not yet synced. Click to sync
                  individually.</li>
                <li><strong>Error - Retry</strong> (red button) &mdash; Sync failed. Click to
                  retry.</li>
              </ul>
            </div>

            <p>
              <strong>Tribute gifts:</strong> Donors on the public donation page can designate their
              gift as &ldquo;In Honor Of&rdquo; or &ldquo;In Memory Of&rdquo; someone. Tribute
              details appear next to the donor name in the donations table.
            </p>
          </div>
        </section>

        {/* Public Donation Pages */}
        <section id="public-donation" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">10. Public Donation Pages</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Each fundraiser automatically has a public donation page at{" "}
              <code>/donate/your-slug</code>. This page does <strong>not</strong> require login
              &mdash; anyone with the link can donate.
            </p>

            <div>
              <strong>What donors see:</strong>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                <li>The fundraiser title and description.</li>
                <li>A progress bar showing how much has been raised toward the goal.</li>
                <li>Preset donation amount buttons (e.g., $25, $50, $100) plus a custom amount
                  field.</li>
                <li>An option to make the donation recurring (monthly or yearly).</li>
                <li>An option to donate anonymously.</li>
                <li>Fields for name and email (email is used for the Stripe receipt).</li>
                <li>An option to make the gift a tribute (&ldquo;In Honor Of&rdquo; or &ldquo;In
                  Memory Of&rdquo;).</li>
              </ul>
            </div>

            <p>
              <strong>Payment flow:</strong> After filling out the form and clicking the donate
              button, the donor is redirected to Stripe&rsquo;s hosted checkout page. Stripe handles
              the credit card entry securely. After payment, the donor sees a thank-you confirmation
              page. If they cancel, they see a cancellation page with a link to try again.
            </p>

            <p>
              <strong>Automatic processing:</strong> When Stripe confirms the payment, the system
              automatically creates a donation record, updates the fundraiser&rsquo;s running total,
              and attempts to match the donor to an existing person by email. If no match is found,
              the donation goes to the Approvals queue on the fundraiser detail page.
            </p>

            <p>
              <strong>Recurring donations:</strong> If the donor selects the recurring option,
              Stripe sets up a subscription. Each subsequent payment (monthly or yearly)
              automatically creates a new donation record and updates the fundraiser total.
            </p>

            <p>
              <strong>Sharing the link:</strong> Find the public donation URL on the fundraiser
              detail page under the Overview tab or the Settings tab. Copy and share it via email,
              social media, or your website.
            </p>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">11. Integrations</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Integrations are managed from the <strong>Settings</strong> page (available to System
              Admins and Office Admins). Each integration shows a card with a{" "}
              <strong>Connected</strong> badge or a <em>Connect</em> button.
            </p>

            <div className="border-l-4 border-indigo-300 pl-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Stripe</h3>
              <p>
                Stripe processes online donations on your public donation pages. Connecting Stripe
                allows payments to go directly to your organization&rsquo;s Stripe account.
              </p>
              <div className="mt-2">
                <strong>Setup:</strong>
                <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                  <li>Go to <strong>Settings</strong> and find the Stripe card under
                    Integrations.</li>
                  <li>Click <em>Connect</em> &mdash; you will be redirected to Stripe to authorize
                    access.</li>
                  <li>After authorizing, you are returned to Settings and will see a green
                    &ldquo;Connected&rdquo; badge.</li>
                </ol>
              </div>
              <p className="mt-2">
                <strong>Disconnecting:</strong> Click <em>Disconnect</em> next to the Connected
                badge. Donations will no longer be routed to your connected Stripe account until you
                reconnect.
              </p>
              <p className="mt-2">
                <strong>Note:</strong> Stripe can be used without connecting a Stripe account (using
                the platform&rsquo;s default account), but connecting your own account ensures funds
                go directly to your organization.
              </p>
            </div>

            <div className="border-l-4 border-indigo-300 pl-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">QuickBooks</h3>
              <p>
                QuickBooks integration lets you sync donation records as Sales Receipts in your
                QuickBooks Online account.
              </p>
              <div className="mt-2">
                <strong>Setup:</strong>
                <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                  <li>Go to <strong>Settings</strong> and find the QuickBooks card under
                    Integrations.</li>
                  <li>Click <em>Connect</em> &mdash; you will be redirected to Intuit to authorize
                    access.</li>
                  <li>After authorizing, you are returned to Settings and will see a green
                    &ldquo;Connected&rdquo; badge.</li>
                </ol>
              </div>
              <div className="mt-2">
                <strong>Syncing donations:</strong>
                <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                  <li><strong>Individual sync:</strong> On the Donations tab of a fundraiser, click
                    the <em>Sync</em> button in the QB column for any unsynced donation.</li>
                  <li><strong>Batch sync:</strong> Click <em>Sync All to QB</em> at the top of the
                    Donations tab to sync all approved, unsynced donations at once.</li>
                </ul>
              </div>
              <p className="mt-2">
                <strong>Disconnecting:</strong> Click <em>Disconnect</em> on the QuickBooks card in
                Settings. Existing synced records in QuickBooks are not affected.
              </p>
              <p className="mt-2">
                <strong>Token refresh:</strong> QuickBooks access tokens expire after one hour. The
                system automatically refreshes them, so you should not need to reconnect under
                normal use.
              </p>
            </div>

            <div className="border-l-4 border-indigo-300 pl-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Constant Contact</h3>
              <p>
                Constant Contact integration lets you sync event invite lists as email contact lists
                for marketing campaigns.
              </p>
              <div className="mt-2">
                <strong>Setup:</strong>
                <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                  <li>Go to <strong>Settings</strong> and find the Constant Contact card under
                    Integrations.</li>
                  <li>Click <em>Connect</em> &mdash; you will be redirected to Constant Contact to
                    authorize access.</li>
                  <li>After authorizing, you are returned to Settings and will see a green
                    &ldquo;Connected&rdquo; badge.</li>
                </ol>
              </div>
              <p className="mt-2">
                Once connected, you can sync event invite lists from the event detail page.
              </p>
            </div>
          </div>
        </section>

        {/* Office Toggle */}
        <section id="office-toggle" className="bg-white rounded-lg shadow p-6 scroll-mt-4">
          <h2 className="text-xl font-semibold text-navy mb-3">12. Office Data Toggle</h2>
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
              Relationships, Interactions, Responses, Events, and Fundraisers will all reflect the
              selected scope.
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
