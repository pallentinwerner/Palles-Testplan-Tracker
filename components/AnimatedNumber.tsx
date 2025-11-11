import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  // FIX: Explicitly pass `undefined` as the initial value to `useRef`.
  // The error "Expected 1 arguments, but got 0" suggests the overload for `useRef` without arguments is not being resolved correctly.
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 500; // Animation duration in ms

    const animate = (timestamp: number) => {
      if (startTimeRef.current === undefined) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final value is exact
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        startTimeRef.current = undefined;
      }
    };

    // Reset animation start time for new value
    startTimeRef.current = undefined;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value]);

  return <span>{displayValue}</span>;
};

export default AnimatedNumber;
