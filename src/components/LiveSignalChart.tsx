import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_PATH || 'http://localhost:8000';

// --- Component 1: Live Signal Chart ---
export default function LiveSignalChart() {
    const [data, setData] = useState(Array.from({ length: 50 }, (_, i) => ({ time: i, value: 0 })));
    useEffect(() => {
        let ws = new WebSocket(`${API_BASE}/api/v1/devices/knockbox-v1-001/events/live`)

        if (ws) {
            ws.onmessage = (event: MessageEvent<any>) => {
                setData(prevData => {
                    const newData = [...prevData.slice(1)];
                    const value = Number(event.data)
                    newData.push({ time: prevData[prevData.length - 1].time + 1, value });
                    return newData;
                })
            }
        }
    }, []);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
                <YAxis domain={[-10, 110]} hide />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}