import { redirect } from "next/navigation";

// The app has no landing page — send users straight to the patients list.
// The client-side auth guard bounces unauthenticated users to /login.
export default function Home() {
  redirect("/patients");
}
