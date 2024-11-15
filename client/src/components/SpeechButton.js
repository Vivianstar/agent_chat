import React, { useState, useRef } from 'react';
import { Mic as MicIcon } from "lucide-react";

const SpeechButton = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const timeoutIdRef = useRef(null);

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setIsListening(false);
  };

  const startSpeechRecognition = () => {
    // If already listening, stop it
    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      const timeoutDuration = 15000;

      recognition.onstart = () => {
        setIsListening(true);
        timeoutIdRef.current = setTimeout(() => {
          stopSpeechRecognition();
        }, timeoutDuration);
      };

      recognition.onresult = (event) => {
        // Get the latest result
        const lastResult = event.results[event.results.length - 1];
        
        // Only process if it's a final result
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript;
          onTranscript(transcript);
          stopSpeechRecognition();
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        clearTimeout(timeoutIdRef.current);
      };

      recognition.onend = () => {
        setIsListening(false);
        clearTimeout(timeoutIdRef.current);
      };

      // Start listening
      recognitionRef.current.start();
    } else {
      alert('Speech recognition is not supported in your browser');
    }
  };

  return (
    <button
      onClick={startSpeechRecognition}
      className={`p-3 rounded-full transition-colors duration-600 ${
        isListening 
          ? 'text-purple-400 bg-purple-400 bg-opacity-20' 
          : 'text-gray-400 hover:text-purple-400'
      }`}
      title={isListening ? "Listening..." : "Voice Input"}
    >
      <MicIcon className="w-5 h-5" />
    </button>
  );
};

export default SpeechButton; 