import React from "react";
import { ChessShort, CHESS_FRAMES } from "./videos/chess/Chess";
import { AbsoluteFill, Composition, interpolate, useCurrentFrame } from "remotion";

// Setup check: if you can see this in the studio, the project works.
// Each real video becomes its own folder in src/videos/ and its own <Composition> below.
const SetupCheck: React.FC = () => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, 90], [-200, 200]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#2A56EB", justifyContent: "center", alignItems: "center" }}>
      <div style={{ color: "white", fontSize: 90, fontFamily: "sans-serif", fontWeight: 800, transform: `translateX(${x}px)` }}>
        STUDIO READY
      </div>
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => (
  <>
    <Composition id="SetupCheck" component={SetupCheck} durationInFrames={90} fps={30} width={1080} height={1920} />
    <Composition id="InfiniteChess" component={ChessShort} durationInFrames={CHESS_FRAMES} fps={30} width={1080} height={1920} />
    {/* <Composition id="MyVideo" component={MyVideo} durationInFrames={MY_FRAMES} fps={30} width={1080} height={1920} /> */}
  </>
);
