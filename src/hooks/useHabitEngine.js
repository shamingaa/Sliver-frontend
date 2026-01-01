import { useState, useEffect, useCallback, useMemo } from 'react';
import { getHabitData, saveHabitData, clearHabitData } from '../lib/storage';

const HABIT_DAYS = 21;

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getMidnight() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function createInitialState(dailyGoal, totalPages) {
  return {
    startDate: getToday(),
    dailyGoal,
    totalPages,
    currentPage: 1,
    daysCompleted: [],
    pagesReadByDate: {},
    lastReadDate: null,
  };
}

export function useHabitEngine() {
  const [habitData, setHabitData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Load habit data from localStorage
  useEffect(() => {
    const data = getHabitData();
    setHabitData(data);
    setIsLoading(false);
  }, []);

  // Persist habit data when it changes
  useEffect(() => {
    if (habitData) {
      saveHabitData(habitData);
    }
  }, [habitData]);

  // Countdown timer to midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = getMidnight();
      const diff = midnight - now;

      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Derived state
  const derivedState = useMemo(() => {
    if (!habitData) {
      return {
        isActive: false,
        currentDay: 0,
        totalDaysCompleted: 0,
        isFreedomMode: false,
        pagesReadToday: 0,
        dailyGoal: 0,
        canReadMore: false,
        dailyProgress: 0,
        habitProgress: 0,
        currentPage: 1,
        totalPages: 0,
        isBookComplete: false,
      };
    }

    const today = getToday();
    const totalDaysCompleted = habitData.daysCompleted.length;
    const isFreedomMode = totalDaysCompleted >= HABIT_DAYS;
    const pagesReadToday = habitData.pagesReadByDate[today] || 0;
    const dailyGoalReached = pagesReadToday >= habitData.dailyGoal;
    const canReadMore = isFreedomMode || !dailyGoalReached;
    const dailyProgress = Math.min((pagesReadToday / habitData.dailyGoal) * 100, 100);
    const habitProgress = (totalDaysCompleted / HABIT_DAYS) * 100;
    const isBookComplete = habitData.currentPage >= habitData.totalPages;

    // Current day is days completed + 1 (if not already completed today)
    const completedToday = habitData.daysCompleted.includes(today);
    const currentDay = completedToday ? totalDaysCompleted : totalDaysCompleted + 1;

    return {
      isActive: true,
      currentDay: Math.min(currentDay, HABIT_DAYS),
      totalDaysCompleted,
      isFreedomMode,
      pagesReadToday,
      dailyGoal: habitData.dailyGoal,
      canReadMore,
      dailyProgress,
      habitProgress,
      currentPage: habitData.currentPage,
      totalPages: habitData.totalPages,
      isBookComplete,
    };
  }, [habitData]);

  // Initialize a new habit
  const initializeHabit = useCallback((dailyGoal, totalPages) => {
    const newData = createInitialState(dailyGoal, totalPages);
    setHabitData(newData);
  }, []);

  // Record reading a page
  const readPage = useCallback((pageNumber) => {
    if (!habitData) return;

    const today = getToday();
    const pagesReadToday = habitData.pagesReadByDate[today] || 0;
    const newPagesReadToday = pagesReadToday + 1;

    // Check if daily goal is now met
    const goalJustMet = newPagesReadToday >= habitData.dailyGoal &&
                        !habitData.daysCompleted.includes(today);

    setHabitData(prev => ({
      ...prev,
      currentPage: pageNumber,
      lastReadDate: today,
      pagesReadByDate: {
        ...prev.pagesReadByDate,
        [today]: newPagesReadToday,
      },
      daysCompleted: goalJustMet
        ? [...prev.daysCompleted, today]
        : prev.daysCompleted,
    }));
  }, [habitData]);

  // Navigate to a specific page (without counting as "read")
  const goToPage = useCallback((pageNumber) => {
    if (!habitData) return;

    setHabitData(prev => ({
      ...prev,
      currentPage: Math.max(1, Math.min(pageNumber, prev.totalPages)),
    }));
  }, [habitData]);

  // Reset everything
  const reset = useCallback(() => {
    clearHabitData();
    setHabitData(null);
  }, []);

  // Update total pages (if PDF metadata changes)
  const updateTotalPages = useCallback((totalPages) => {
    if (!habitData) return;

    setHabitData(prev => ({
      ...prev,
      totalPages,
    }));
  }, [habitData]);

  return {
    ...derivedState,
    countdown,
    isLoading,
    initializeHabit,
    readPage,
    goToPage,
    reset,
    updateTotalPages,
    rawData: habitData,
  };
}

export default useHabitEngine;
