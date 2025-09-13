import TwoAxisViewer from "@/components/TwoAxisViewer";

export default function Home() {
  return (
    <main style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
      <div>
        <h2 style={{ textAlign: "center", marginBottom: 12 }}>Saurabh Test</h2>

        <TwoAxisViewer
          horizontalCount={361}
          verticalCount={361}
          hBase={"Watch-Horizontal."}      // exact base filename for horizontal frames
          vCandidates={["Watch-Vertical.", "Watch-Verital."]} // try Vertical first, then Verital fallback
          fileExt={"png"}
          sensitivity={6}
          width={600}
          height={600}
        />
      </div>
    </main>
  );
}
