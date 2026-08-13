import { CollapsibleSection } from "./CollapsibleSection";

export function TestingGuide() {
  return (
    <CollapsibleSection title="How to test with a subject" subtitle="After electrodes are on the head" defaultOpen>
      <div className="testing-guide">
        <p className="safety-block">
          Educational prototype only — not a medical device. Use on battery power if possible; avoid
          mains-powered USB while electrodes are on skin.
        </p>

        <h4>1. Electrode placement (AD8232 — 3 pads)</h4>
        <ul>
          <li>
            <strong>Reference (RL)</strong> — earlobe or mastoid (behind ear), cleaned skin.
          </li>
          <li>
            <strong>Active (LA)</strong> — forehead (Fp1/Fp2 area) or occipital (O1/O2) for alpha.
          </li>
          <li>
            <strong>RA</strong> — second reference on opposite earlobe, or another stable site per your
            wiring diagram.
          </li>
          <li>Use conductive gel or wet sponge electrodes; press firmly for good contact.</li>
        </ul>

        <h4>2. Start the software</h4>
        <ol>
          <li>
            In a terminal: <code>cd neuro-project</code> then <code>npm start</code>
          </li>
          <li>Dashboard opens at http://localhost:5173</li>
          <li>
            If first time: upload firmware once via <strong>Upload firmware to ESP32</strong> (BOOT +
            EN steps).
          </li>
        </ol>

        <h4>3. Connect and verify signal</h4>
        <ol>
          <li>Close the serial plotter window, then click <strong>Connect hardware</strong> (COM5 or your port).</li>
          <li>
            Check <strong>System status</strong>: Lead = connected, ADS1015 = detected, ~250 Hz sample rate.
          </li>
          <li>
            Subject sits still, eyes closed 30 s — you should see alpha band rise in{" "}
            <strong>Frequency bands</strong>.
          </li>
          <li>Lead-off: LED off / buzzer on hardware; dashboard shows Lead off — re-seat electrodes.</li>
        </ol>

        <h4>4. Record or run experiment</h4>
        <ol>
          <li>
            Sidebar → <strong>Start recording</strong> to save CSV under <code>data/raw/</code>
          </li>
          <li>
            Or <strong>Eyes open / closed</strong> for the guided protocol (follow on-screen instructions).
          </li>
          <li>Stop recording when done; train model later from Dataset / sidebar if needed.</li>
        </ol>

        <h4>Quick checks</h4>
        <ul className="check-list">
          <li>Waveform scrolling in Live brain-wave trace</li>
          <li>Signal quality above ~40</li>
          <li>No constant “Lead off” warning</li>
          <li>Blinking produces brief artifact spikes (normal)</li>
        </ul>
      </div>
    </CollapsibleSection>
  );
}
