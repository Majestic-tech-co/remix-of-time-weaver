import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Privacy — Majestic" },
      { name: "description", content: "How Majestic handles your data, privacy, and security." },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trust & Privacy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page is maintained by the Majestic app owner to answer common questions about how the
          app handles your data. It is editable project content, not an independent certification.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Local-first data storage</CardTitle>
          <CardDescription>Your time entries stay on your device.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Majestic is a local-first time tracker. Customers, projects, timesheet entries, and the
            active timer are stored in your browser's local storage. No account is required and no
            timesheet data is sent to a Majestic-operated server.
          </p>
          <p>
            Clearing your browser storage or using a different browser/device will remove or hide
            your data, since it is not synced.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What we collect</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The app itself does not collect personal information, analytics, or telemetry. Invoices
            you generate as PDFs are produced entirely in your browser and downloaded directly to
            your device.
          </p>
          <p>
            The hosting platform may collect standard request metadata (such as IP address and user
            agent) needed to serve the page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subprocessors & integrations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Majestic loads web fonts from Google Fonts to render the interface. No third-party
            analytics, advertising, or tracking scripts are bundled with the app.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deleting your data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Because data lives in your browser, you can remove it at any time by clearing site data
            for this domain in your browser settings.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            For privacy or security questions, contact the app owner who deployed this instance of
            Majestic.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
