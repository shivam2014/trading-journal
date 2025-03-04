import { db } from "@/lib/db";
import WelcomeOptions from "@/components/welcome/WelcomeOptions";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

async function hasTrades() {
  const result = await db.query('SELECT COUNT(*) as count FROM trades');
  return result.rows[0].count > 0;
}

async function initializeDemoData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trades/demo`, {
      method: 'POST',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Failed to initialize demo mode');
    }

    return true;
  } catch (error) {
    console.error('Error initializing demo mode:', error);
    return false;
  }
}

export default async function HomePage() {
  const hasExistingTrades = await hasTrades();

  if (!hasExistingTrades) {
    const demoInitialized = await initializeDemoData();
    
    if (demoInitialized) {
      redirect('/trades');
    }

    return <WelcomeOptions />;
  }

  return <DashboardContent />;
}
