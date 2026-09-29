import os
import json
import logging
from typing import Dict, Any, Optional
from backend.app.config import settings

logger = logging.getLogger(__name__)

def generate_ai_report(
    room_info: Dict[str, Any],
    sensor_reading: Dict[str, Any],
    prediction_result: Dict[str, Any],
    recent_history: Optional[list] = None
) -> Dict[str, str]:
    """
    Generates intelligent root-cause explanation and actionable recommendations
    using Gemini API (gemini-3.8-flash).
    Falls back gracefully if the API is offline or key is missing.
    """
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    
    room_str = f"Room {room_info.get('room_number', '101')} (Block {room_info.get('block', 'A')}, Floor {room_info.get('floor', 1)})"
    temp = sensor_reading.get("temperature", 0.0)
    hum = sensor_reading.get("humidity", 0.0)
    light = sensor_reading.get("light", 0.0)
    motion = "Detected" if sensor_reading.get("motion") else "None"
    air_q = sensor_reading.get("air_quality", "N/A")
    anomaly_type = prediction_result.get("anomaly_type", "UNKNOWN")
    confidence = prediction_result.get("confidence", 0.85)

    prompt = f"""You are an expert AIoT Facilities Engineer analyzing an environmental anomaly in a smart university hostel.

ROOM: {room_str}
LATEST SENSOR TELEMETRY:
- Temperature: {temp}°C
- Humidity: {hum}%
- Light Intensity: {light} Lux
- PIR Motion: {motion}
- MQ-135 Air Quality / Gas Index: {air_q} ppm

DNN ANOMALY PREDICTION:
- Classification: ANOMALY
- Anomaly Category: {anomaly_type}
- Model Confidence: {confidence:.2%}

Analyze this situation and provide output in strict JSON format with these exact keys:
1. "explanation": A concise, clear 2-3 sentence overview of what is happening.
2. "possible_causes": A bulleted list or newline-separated items of root causes (e.g. faulty air conditioner, overcrowding, electrical heating, window left open during rain, fire hazard).
3. "recommendation": A prioritized list of immediate safety and maintenance actions for the hostel warden/students.

Respond ONLY with valid JSON.
"""

    if api_key:
        # Try official google-genai or requests
        try:
            from google import genai
            client = genai.Client(api_key=api_key, http_options={'headers': {'User-Agent': 'aistudio-build'}})
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                # Clean markdown backticks
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
                raw_text = raw_text.strip()

            parsed = json.loads(raw_text)
            return {
                "explanation": str(parsed.get("explanation", "")).strip(),
                "possible_causes": str(parsed.get("possible_causes", "")).strip(),
                "recommendation": str(parsed.get("recommendation", "")).strip()
            }
        except Exception as e:
            logger.warning(f"Gemini API request failed: {e}. Falling back to domain expert engine.")

    # Domain-Expert Deterministic Fallback if GenAI is unavailable or no key
    if "FIRE" in anomaly_type or temp >= 37.0:
        return {
            "explanation": f"Critical thermal escalation detected in {room_str}. Current temperature ({temp}°C) and air quality levels ({air_q} ppm) indicate significant potential combustion or severe electrical overheating risk.",
            "possible_causes": "- Electrical short circuit or overheated appliance (iron, electric kettle, charging pack)\n- Unattended cooking or open flame\n- Total HVAC failure combined with direct intense sunlight",
            "recommendation": "1. Immediately dispatch floor warden to physically inspect Room {room_info.get('room_number', '101')}.\n2. Alert occupants to evacuate if smoke or burning odor is present.\n3. Cut power to room circuit breakers if thermal spike persists."
        }
    elif "OVERHEATING" in anomaly_type or temp >= 33.0:
        return {
            "explanation": f"Elevated ambient room temperature ({temp}°C) above comfortable and safe student living thresholds in {room_str}.",
            "possible_causes": "- Air conditioning unit malfunction or switched off\n- Poor cross-ventilation with closed windows\n- High electronic heat dissipation from multiple laptops/desktops",
            "recommendation": "1. Ensure ventilation fans and AC units are operating efficiently.\n2. Open windows for cross-draft if external weather permits.\n3. Verify student well-being and hydration."
        }
    elif "HUMIDITY" in anomaly_type or hum >= 80.0:
        return {
            "explanation": f"Sustained extreme relative humidity ({hum}%) detected in {room_str}. Damp conditions promote rapid mold spore propagation and respiratory discomfort.",
            "possible_causes": "- Water pipe leakage or bathroom door left open\n- Damp laundry dried indoors without exhaust airflow\n- External monsoon rain ingress through unsealed balcony/window",
            "recommendation": "1. Inspect bathroom plumbing and room perimeter for water ingress.\n2. Run dehumidifier or activate AC in dry mode.\n3. Advise occupants against drying wet fabrics indoors."
        }
    elif "VENTILATION" in anomaly_type or (air_q != "N/A" and float(air_q) > 100):
        return {
            "explanation": f"Elevated volatile organic compounds or stagnant carbon dioxide accumulation ({air_q} ppm) detected in {room_str}.",
            "possible_causes": "- Room sealed with high human occupancy\n- Chemical aerosol or cleaning agent usage\n- Insufficient fresh air circulation",
            "recommendation": "1. Open doors and windows to cycle ambient air immediately.\n2. Inspect room for active aerosol or chemical sources.\n3. Clean ventilation filters."
        }
    else:
        return {
            "explanation": f"Multivariate sensor anomaly detected by DNN inference in {room_str}. Telemetry deviation from normal student hostel baseline.",
            "possible_causes": "- Simultaneous shifts in temperature ({temp}°C), humidity ({hum}%), and light levels\n- Sensor calibration drift or localized heat/light source near node",
            "recommendation": "1. Perform a visual check of the ESP32 node placement.\n2. Verify room environmental conditions.\n3. Monitor trends for the next 15 minutes."
        }
