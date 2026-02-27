'use client';

import { useState, useEffect, useCallback } from 'react';

import ChestScene from '@/components/ChestModel';
import LiveSignalChart from '@/components/LiveSignalChart'
import RecordedPatternChart from '@/components/RecordedPatternChart'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH || 'http://localhost:8000';
const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID || 'test-device-001';

// --- Main Dashboard Component ---
export default function Dashboard() {
  const [sensitivity, setSensitivity] = useState<number>(0.0);
  const [rmseThreshold, setRmseThreshold] = useState<number>(0);
  const [idleCutoffPeriod, setIdleCutoffPeriod] = useState<number>(0);
  const [patternRep, setPatternRep] = useState<Array<number>>([])
  const [events, setEvents] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [deviceState, setDeviceState] = useState<any>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [patternPanelState, setPatternPanelState] = useState<"DEFAULT" | "RECORD" | "END">("DEFAULT")
  const [pattern, setPattern] = useState<any[]>();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/devices/${DEVICE_ID}/config`);
      const data = await res.json();
      if (data && data.desired.data) {
        setSensitivity((data.desired.data.activation_threshold || 0) / 1024);
        setRmseThreshold(data.desired.data.predict_threshold || 0);
        setIdleCutoffPeriod(data.desired.data.idle_cutoff_period || 0);
        setPatternRep(data.desired.data.pattern_representation || []);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async () => {
    const payload = {
      rev: 1,
      data: {
        activation_threshold: Math.round(sensitivity * 1024),
        predict_threshold: rmseThreshold,
        pattern_representation: patternRep,
        idle_cutoff_period: idleCutoffPeriod
      }
    };
    try {
      await fetch(`${API_BASE}/api/v1/devices/${DEVICE_ID}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      alert('Configuration pushed to device.');
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  };

  useEffect(() => {
    const pollData = async () => {
      try {
        const eventsRes = await fetch(`${API_BASE}/api/v1/devices/${DEVICE_ID}/events/latest?limit=10`);
        const eventsData = await eventsRes.json();
        if (eventsData && eventsData.items) {
          setEvents(eventsData.items);
        }

        const devStateRes = await fetch(`${API_BASE}/api/v1/stats/${DEVICE_ID}/snapshot`);
        const devStateData = await devStateRes.json();
        if (devStateData && devStateData.lastKnockResult && devStateData.lastKnockResult.matched) {
          setIsLocked(false);
        } else setIsLocked(true);

        setDeviceState({ status: "online" })
      } catch (error) {
        console.error("Polling failed:", error);
        setDeviceState({ status: "offline" })
      }
    };

    const intervalId = setInterval(pollData, 2000);
    return () => clearInterval(intervalId);
  }, []);

  const handleMicToggle = async () => {
    try {
      if (!isRecording) {
        setIsRecording(true);
        setPatternPanelState("RECORD")
      } else {
        setIsRecording(false);
        setPatternPanelState("END")
      }
    } catch (error) {
      console.error("Failed to toggle mic state:", error);
    }
  };

  const handlePatternUpload = async () => {
    setPatternRep(pattern as number[])
    const payload = {
      rev: 1,
      data: {
        activation_threshold: Math.round(sensitivity * 1024),
        predict_threshold: rmseThreshold,
        pattern_representation: pattern,
        idle_cutoff_period: idleCutoffPeriod
      }
    };
    await fetch(`${API_BASE}/api/v1/devices/${DEVICE_ID}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setPattern(undefined)
    alert('Configuration pushed to device.');
    setPatternPanelState("DEFAULT")
  }

  const handleCancelPattern = async () => {
    try {
      setIsProcessing(false)
      setPatternPanelState("DEFAULT")
    } catch (error) {
      console.error("Failed to cancel pattern:", error);
    }
  };

  const storePattern = async (a: any) => {
    setPattern(a);
    setIsProcessing(false);
  }

  return (
    <div className={`min-h-screen w-full flex overflow-hidden bg-gradient-to-tr text-white p-6 transition-colors duration-1000 ease-in-out ${isLocked ? 'from-red-950 via-neutral-900 to-black' : 'from-green-950 via-neutral-900 to-black'
      }`}>

      {/* 3D Chest Scene */}
      <ChestScene isLocked={isLocked} />

      {/* Background Element for Chest Animation Indicator */}
      <div className="absolute top-0 right-0 bottom-0 w-2/3 pointer-events-none flex items-center justify-center opacity-10 z-0 overflow-hidden">
        <h1 className="text-[8vw] xl:text-[10vw] font-bold tracking-widest uppercase text-center select-none whitespace-nowrap">
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </h1>
      </div>

      {/* Left Column */}
      <div className="w-1/3 flex flex-col gap-6 pr-6 border-r border-neutral-700 z-10">

        {/* Device State */}
        <div className="bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Device State</h2>
            <span className={`px-2 py-1 rounded text-xs font-bold ${deviceState === null ? 'bg-indigo-600' : (deviceState?.status === 'online' ? 'bg-green-600' : 'bg-red-600')} `}>
              {deviceState === null ? 'CONNECTING' : (
                deviceState?.status?.toUpperCase() || 'OFFLINE'
              )}
            </span>
          </div>
          {/* <div className="flex gap-4 text-sm text-neutral-400 mb-4">
            <div>Battery: <span className="text-white">{deviceState?.telemetry?.battery || '--'}%</span></div>
            <div>RSSI: <span className="text-white">{deviceState?.telemetry?.rssi || '--'} dBm</span></div>
          </div> */}
          <div className="flex gap-2">
            {(isLocked) ? (
              <button disabled onClick={() => { }} className="flex-1 bg-red-900 hover:bg-red-800 py-2 rounded font-semibold transition-colors">Current State : Locked</button>
            ) : (
              <button disabled onClick={() => { }} className="flex-1 bg-green-900 hover:bg-green-800 py-2 rounded font-semibold transition-colors">Current State : Unlocked</button>
            )}
          </div>
        </div>

        {/* Threshold Panel */}
        <div className="bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-700">
          <h2 className="text-xl font-bold mb-4">Threshold Config</h2>
          {loadingConfig ? <p className="text-neutral-400">Fetching state...</p> : (
            <div className="space-y-4">
              <div>
                <label className="flex justify-between text-sm mb-1">
                  <span>Sensitivity</span>
                  <span>{sensitivity.toFixed(2)} / 1.0</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="flex justify-between text-sm mb-1">
                  <span>RMSE Threshold</span>
                  <span>{rmseThreshold} / 1500</span>
                </label>
                <input
                  type="range" min="0" max="1500" step="10"
                  value={rmseThreshold}
                  onChange={(e) => setRmseThreshold(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <button
                onClick={updateConfig}
                className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-semibold transition-colors">
                Update & Push to Device
              </button>
            </div>
          )}
        </div>

        {/* Live Line Chart */}
        <div className="bg-neutral-800 flex-1 p-4 rounded-lg shadow-lg border border-neutral-700 flex flex-col min-h-[250px]">
          <h3 className="text-sm text-neutral-400 mb-2">Live Line chart for the live signal</h3>
          <div className="relative w-full h-full min-h-[200px] bg-neutral-900 rounded overflow-hidden">
            <LiveSignalChart />
          </div>
        </div>

        {/* System Log */}
        <div className="bg-neutral-800 h-64 p-4 rounded-lg shadow-lg border border-neutral-700 flex flex-col">
          <h3 className="text-sm text-neutral-400 mb-2">Access Log</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {events.length === 0 ? (
              <p className="text-neutral-500 text-sm">No events recorded.</p>
            ) : (
              events.map((ev, idx) => {
                const isKnock = ev.type === 'knock_result';
                const passed = ev.matched === true;
                const rawTs = ev.ts || ev.serverReceivedTs;
                const isautoClosed = ev.payload.meta.schema_ == "knock_result/v1-e"
                const timeString = rawTs ? new Date(rawTs).toLocaleTimeString() : 'Unknown time';

                let contentDetails = '';
                if (isKnock) {
                  const score = ev.score ?? ev.payload?.data?.score ?? 'N/A';
                  const pattern = ev.pattern || ev.payload?.data?.patternId || 'Unknown';
                  contentDetails = `Score: ${score} | Pattern: ${pattern}`;
                } else if (ev.payload?.data && typeof ev.payload.data === 'object') {
                  contentDetails = Object.entries(ev.payload.data)
                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                    .join(', ');
                } else {
                  contentDetails = 'No additional data';
                }

                return (
                  <div key={idx} className={`bg-neutral-700 p-2 rounded text-sm flex flex-col gap-1 border-l-4 ${isKnock ? (passed ? 'border-green-500' : 'border-red-500') : 'border-blue-500'}`}>
                    <div className="flex justify-between items-center">
                      {isKnock ? (
                        <span className={`font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                          {isautoClosed ? 'Autoclosed' : `
                            ${passed ? 'Passed (Knock)' : 'Failed (Knock)'}
                          `}
                        </span>
                      ) : (
                        <span className="text-blue-300 font-bold capitalize">{ev.type?.replace('_', ' ')}</span>
                      )}
                      <span className="text-neutral-400 text-xs font-mono">{timeString}</span>
                    </div>
                    <div className="text-neutral-300 text-xs truncate" title={contentDetails}>
                      {contentDetails}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="w-2/3 flex flex-col justify-end items-end pl-6 pb-6 z-10">
        <div className="w-full max-w-2xl bg-neutral-800 p-4 rounded-lg shadow-lg border border-neutral-700 flex flex-col gap-4 relative">
          <h3 className="text-sm text-neutral-400">Live line chart of the recorded knocking pattern</h3>

          <div className="h-48 w-full border border-neutral-600 border-dashed rounded bg-neutral-900 overflow-hidden">
            <RecordedPatternChart isRecording={isRecording} callback={storePattern} />
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-neutral-400">
              {patternPanelState == "RECORD" && <span className="text-red-400 animate-pulse">● Recording active...</span>}
            </div>
            <div className="flex gap-4">
              {patternPanelState == "END" && (
                <>
                  {isProcessing && pattern !== undefined ? (
                    <p>Loading...</p>
                  ) : (
                    <>
                      <button onClick={handleCancelPattern} className="bg-neutral-600 hover:bg-neutral-500 px-4 py-2 rounded font-semibold transition-colors text-sm">
                        Cancel
                      </button>
                      <button onClick={handlePatternUpload} className={`rounded-full w-16 h-16 flex items-center justify-center font-bold text-lg shadow-lg transition-all transform hover:scale-105 ${'bg-blue-600 hover:bg-blue-500'
                        }`}>
                        Upload
                      </button>
                    </>
                  )}
                </>
              )}
              {["DEFAULT", "RECORD"].includes(patternPanelState) && (
                <button onClick={handleMicToggle} className={`rounded-full w-16 h-16 flex items-center justify-center font-bold text-lg shadow-lg transition-all transform hover:scale-105 ${isRecording ? 'bg-red-600 animate-pulse ring-4 ring-red-900' : 'bg-blue-600 hover:bg-blue-500'
                  }`}>
                  {isRecording ? 'END' : 'MIC'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}