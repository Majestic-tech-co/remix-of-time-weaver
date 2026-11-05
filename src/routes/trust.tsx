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
    <div className="space-y-6 max-w-3xl mx-auto px-4 py-10 md:py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trust & Privacy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This page is maintained by the Majestic app owner to answer common questions about how the
          app handles your data. It is editable project content, not an independent certification.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Where your data is stored</CardTitle>
          <CardDescription>Your account and records are stored in a hosted database.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Majestic requires an account (email and password). Your customers, projects, time
            entries, boards, receipts, and tax settings are stored in a Supabase database, and
            receipt files you upload are kept in private Supabase file storage.
          </p>
          <p>
            Each record is tied to your account, and database access rules only let you read or
            change your own records. Receipt files can only be opened through short-lived links
            created for your signed-in account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What we collect</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            We store what you enter into the app: your email address, the customers, projects, and
            time you track, receipts and expense details, and business details such as your GST/PST
            registration numbers. We don't use analytics, advertising, or tracking scripts.
          </p>
          <p>
            Invoices and tax reports are generated as PDFs in your browser and downloaded directly to
            your device; they are not uploaded anywhere.
          </p>
          <p>
            Your browser keeps your sign-in session and the currently running timer in local storage
            on your device. No other cookies or trackers are set.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subprocessors & integrations</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-foreground">Supabase</span> (provisioned through Lovable Cloud) — database, sign-in, and receipt file storage.</li>
            <li><span className="text-foreground">Vercel</span> — hosts and serves the app; it receives standard request data such as IP address and browser type.</li>
            <li><span className="text-foreground">Google Fonts</span> — serves the app's fonts, so your browser contacts Google when pages load.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deleting your data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            You can delete customers, projects, time entries, boards, and receipts at any time from
            within the app; deleting a receipt also deletes its uploaded file.
          </p>
          <p>
            To delete your account and everything stored with it, contact the app owner using the
            details below.
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
