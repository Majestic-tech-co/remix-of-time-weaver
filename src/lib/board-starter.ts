import type { CardPriority } from "./types";

// Starter backlog imported from the original standalone boards.html.
export const STARTER_BOARD: {
  name: string;
  columns: { title: string; cards: { title: string; description: string; priority: CardPriority }[] }[];
} = {
  name: "MCSC Training & AI Upgrade",
  columns: [
    {
      title: "Backlog",
      cards: [
        {
          title: "Create explainer videos with Google's Notebook LM.",
          description: "Use Notebook LM to generate engaging explainer audio/video content for course modules.",
          priority: "High",
        },
        {
          title: "Create multiple choice quizzes for students to check understanding after each major section.",
          description: "Draft post-section assessment questions to verify understanding.",
          priority: "Medium",
        },
        {
          title: "Provide students with YouTube links to the videos on the training site.",
          description: "Embed and link relevant video materials directly into the training site interface.",
          priority: "Low",
        },
        {
          title: "Upload course notes for students to review.",
          description: "Organize and make downloadable PDF/digital study guides available.",
          priority: "Medium",
        },
        {
          title: "Setup AI powered scenario based quizzes (similar to existing Supervisor AI Training module).",
          description: "Configure interactive AI simulation engine for scenario evaluation.",
          priority: "Urgent",
        },
        {
          title: "Setup final exam.",
          description: "Construct comprehensive end-of-course final examination module.",
          priority: "High",
        },
        {
          title: "Automated email system to be updated so emails clearly indicate which certificate the student has earned.",
          description: "Update email templates and dynamic tags to reflect specific completed certification.",
          priority: "High",
        },
        {
          title: "Gating system to be implemented that prevents the student from accessing the advanced supervisor training materials unless permitted by MCSC through the admin dashboard.",
          description: "Implement role/permission gating controllable via admin dashboard toggle.",
          priority: "Urgent",
        },
        {
          title: "Gating system to be upgraded to ensure that students take all video quizzes before unlocking the scenario based AI interactive quizzes.",
          description: "Add prerequisite quiz validation triggers prior to unlocking AI scenarios.",
          priority: "High",
        },
        {
          title: "Adding ability to track student quiz progress from the admin panel.",
          description: "Build telemetry/progress dashboard for administrators to review student quiz scores and completion stats.",
          priority: "Medium",
        },
        {
          title: "MCSC/BSD Branding on new AI generated videos.",
          description: "Apply consistent watermarks, intros, and lower-thirds branding on all newly generated videos.",
          priority: "Medium",
        },
        {
          title: "Run one time security updates on MCSC’s server (this is not a maintenance contract, however, we may as well do basic maintenance pass as part of the project).",
          description: "Perform OS patching, security hardening, and basic system cleanup.",
          priority: "High",
        },
        {
          title: "BSD XR will assist MCSC with uploading videos to YouTube.",
          description: "We have decided to use the existing Trade Up Manitoba YouTube page. Any deviations from this plan will result in extra charges. BSD XR is not responsible for creating or setting up new YouTube channels for MCSC.",
          priority: "Medium",
        },
        {
          title: "Existing YouTube videos to be replaced with explainer videos created in Notebook LM.",
          description: "Swap out outdated video embeds on the platform with fresh Notebook LM explainer assets.",
          priority: "Medium",
        },
        {
          title: "Digital curriculum documents to be uploaded to the website and made accessible to the students.",
          description: "These digital documents have already been provided to BSD by Ramir.",
          priority: "Medium",
        },
        {
          title: "Adding AI generated quizzes to go along with the new AI videos.",
          description: "Synchronize AI quiz generation pipelines with newly produced video modules.",
          priority: "High",
        },
      ],
    },
    { title: "In Progress", cards: [] },
    { title: "Review / Testing", cards: [] },
    { title: "Done", cards: [] },
  ],
};

export const DEFAULT_COLUMNS = ["Backlog", "In Progress", "Done"];
