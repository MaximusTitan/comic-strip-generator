// comic-strip-generator/src/app/credits/page.tsx
"use client"
import Component from "@/components/ui/component";

const Page = () => {
  const onUpdateCredits = (newCredits: number) => {
    console.log("Updated credits:", newCredits);
  };

  return (
    <div>
      <Component onUpdateCredits={onUpdateCredits} />
    </div>
  );
};

export default Page;
