import { useState, useCallback } from "react";
import { LatencyOptimisedTranslator } from "@mkljczk/bergamot-translator/translator.js";

const translator = new LatencyOptimisedTranslator(
  { from: "es", to: "en" },
  { workerUrl: `${import.meta.env.BASE_URL}worker/translator-worker.js` },
);

export function useTranslation() {
  const [translating, setTranslating] = useState(false);

  const translate = useCallback(async (text: string): Promise<string | null> => {
    setTranslating(true);
    try {
      const result = await translator.translate({
        from: "es",
        to: "en",
        text,
        html: false,
        qualityScores: false,
      });
      return result.target.text;
    } finally {
      setTranslating(false);
    }
  }, []);

  return { translate, translating };
}
