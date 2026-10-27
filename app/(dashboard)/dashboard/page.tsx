
"use client";

import { useState } from "react";
import {
  PiCaretLeft,
  PiCaretRight,
  PiCheck,
  PiClock,
  PiDotsThreeVertical,
  PiPauseFill,
  PiPlus,
  PiSparkle,
  PiStopFill,
  PiVideoCamera,
} from "react-icons/pi";

import { Button } from "@/components/ui/button";

const initialTasks = [
  { id: 1, title: "Call Linda before vacation", done: false },
  { id: 2, title: "Finish the sales presentation for the client", done: false },
  { id: 3, title: "Send follow-up emails", done: true },
  { id: 4, title: "Review analytics report", done: false },
  { id: 5, title: "Take 10-minute break", done: true },
];

const assignedTasks = [
  { title: "New ideas for campaign", progress: 60, color: "#fb6544" },
  { title: "Change button", progress: 27, color: "#e4b800" },
  { title: "New BrandBook", progress: 95, color: "#e4b800" },
  { title: "Wireframe for List", progress: 78, color: "#23bf80" },
  { title: "Design PPT #4", progress: 92, color: "#e4b800" },
];

export default function HomePage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [timerRunning, setTimerRunning] = useState(true);
  const [activeTab, setActiveTab] = useState("Upcoming");

  const completedTasks = tasks.filter((task) => task.done).length;

  const visibleTasks = assignedTasks.filter((task) =>
    activeTab === "Completed"
      ? task.progress === 100
      : activeTab === "Overdue"
        ? task.progress < 30
        : task.progress >= 30
  );

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#24251f] sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Greeting */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-neutral-400">
              Monday, September 30
            </p>

            <h1 className="text-2xl font-normal tracking-tight sm:text-3xl">
              <span className="text-neutral-600">Good morning, </span>
              <span className="font-semibold text-black">Amanda</span>
            </h1>
          </div>

          <Button
            variant="outline"
            className="h-9 rounded-lg border-border bg-white text-xs shadow-none hover:bg-[#f4f4ef]"
          >
            Customize <PiSparkle className="ml-1 size-3.5" />
          </Button>
        </section>

        {/* Main dashboard grid */}
        <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          {/* Left column: To-do list and timer */}
          <div className="grid min-w-0 grid-cols-1  gap-4 sm:grid-cols-2 xl:col-span-7">
            {/* To-do list */}
            <div className="min-w-0 rounded-2xl bg-neutral-100 p-4 shadow-xs">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  <span className="mr-2">✏️</span>
                  To do list
                </h2>

                <button
                  type="button"
                  aria-label="Task options"
                  className="rounded-md p-1 text-primary font-bold hover:bg-[#f5f5f0]"
                >
                  <PiDotsThreeVertical className="size-5" />
                </button>
              </div>

              <div className="mb-3 h-px bg-neutral-100" />

              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2.5 text-sm leading-5"
                  >
                    <button
                      type="button"
                      aria-label={
                        task.done
                          ? `Mark ${task.title} incomplete`
                          : `Complete ${task.title}`
                      }
                      onClick={() =>
                        setTasks((current) =>
                          current.map((item) =>
                            item.id === task.id
                              ? { ...item, done: !item.done }
                              : item
                          )
                        )
                      }
                      className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border ${
                        task.done
                          ? "border-[#838c08] bg-[#838c08] text-white"
                          : "border-[#d5d6cf] bg-white"
                      }`}
                    >
                      {task.done && <PiCheck className="size-3" />}
                    </button>

                    <span
                      className={
                        task.done
                          ? "text-[#838c08] line-through"
                          : "text-neutral-600"
                      }
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>

            </div>

            {/* Time tracker */}
            <div className="relative flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-2xl bg-[#e8f811]  p-4 text-neutral-700 sm:min-h-[315px]">
              <div className="pointer-events-none absolute -right-12 -top-16 size-64 rounded-full bg-[#838c08]" />

              <div className="pointer-events-none absolute -bottom-28 -left-16 size-80 rounded-full bg-[#e2f11a] shadow-xs " />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Time tracker</h2>

                <button
                  type="button"
                  aria-label="Timer options"
                  className="text-white font-bold p-1.5 cursor-pointer"
                >
                  <PiDotsThreeVertical className="size-5" />
                </button>
              </div>

              <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                <p className="text-3xl font-light tracking-tight sm:text-4xl">
                  04:21:58
                </p>

                <p className="mt-3 text-center text-[11px] text-neutral-800">
                  {timerRunning ? "Focus session in progress" : "Timer paused"}
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-3 pb-1">
                <button
                  type="button"
                  onClick={() => setTimerRunning((running) => !running)}
                  aria-label={timerRunning ? "Pause timer" : "Resume timer"}
                  className="flex size-10 items-center justify-center rounded-full bg-white text-[#24251f] shadow-sm transition hover:scale-105 cursor-pointer"
                >
                  {timerRunning ? (
                    <PiPauseFill className="size-4" />
                  ) : (
                    <PiPlus className="size-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setTimerRunning(false)}
                  aria-label="Stop timer"
                  className="flex size-10 items-center justify-center rounded-full bg-[#ff493f] text-white shadow-sm transition hover:scale-105 cursor-pointer"
                >
                  <PiStopFill className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right column: Activity */}
          <div className="flex min-w-0 flex-col gap-4 xl:col-span-5">
            {/* Activity */}
            <div className="rounded-2xl bg-[#080808] p-4 text-white shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Activity</h2>

                <div className="flex items-center gap-3 text-[13px]">
                  <button
                    type="button"
                    className="border-b-2 border-[#e4f222] pb-1 text-white cursor-pointer"
                  >
                    weekly
                  </button>

                  <button
                    type="button"
                    className="pb-1 text-[#888880] hover:text-white cursor-pointer"
                  >
                    daily
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 rounded-xl bg-[#191919] p-4 sm:grid-cols-2 sm:items-center">
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-[12px] text-[#b1b1a9]">
                      <span className="mr-2 inline-block h-2.5 w-0.5 bg-[#ffb51b]" />
                      Working hours
                    </p>
                    <p className="text-2xl font-light">29/40</p>
                  </div>

                  <div>
                    <p className="mb-1 text-[12px] text-[#b1b1a9]">
                      <span className="mr-2 inline-block h-2.5 w-0.5 bg-[#22c5bd]" />
                      Tasks completed
                    </p>
                    <p className="text-2xl font-light">
                      {completedTasks + 6}/12
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-[12px] text-[#b1b1a9]">
                      <span className="mr-2 inline-block h-2.5 w-0.5 bg-[#d0a7ff]" />
                      Projects completed
                    </p>
                    <p className="text-2xl font-light">4/7</p>
                  </div>
                </div>

                {/* Circular activity indicators */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative size-36 sm:size-40">
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "conic-gradient(#ffb51b 0deg 260deg, #414141 260deg 360deg)",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                        WebkitMask:
                          "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                      }}
                    />

                    <div
                      className="absolute inset-[12px] rounded-full"
                      style={{
                        background:
                          "conic-gradient(#22c5bd 0deg 235deg, #414141 235deg 360deg)",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                        WebkitMask:
                          "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                      }}
                    />

                    <div
                      className="absolute inset-[24px] rounded-full"
                      style={{
                        background:
                          "conic-gradient(#20b7f0 0deg 275deg, #414141 275deg 360deg)",
                        mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                        WebkitMask:
                          "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
                      }}
                    />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-5 rounded-full bg-[#191919]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-center gap-1">
                <span className="h-1 w-3 rounded-full bg-white" />
                <span className="h-1 w-3 rounded-full bg-[#565656]" />
              </div>
            </div>
          </div>
        </section>

        {/* Bottom row: Reminder and Assigned Tasks */}
        <section className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {/* Meeting reminder */}
          <div className="w-full min-w-0 rounded-2xl bg-neutral-100 p-4 ">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Reminder</h2>

              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Previous reminder"
                  className="rounded-full border border-[#ededE7] p-1 hover:bg-[#f5f5f0] cursor-pointer"
                >
                  <PiCaretLeft className="size-3" />
                </button>

                <button
                  type="button"
                  aria-label="Next reminder"
                  className="rounded-full border border-[#ededE7] p-1 hover:bg-[#f5f5f0] cursor-pointer"
                >
                  <PiCaretRight className="size-3" />
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#f8f8f5] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Today&apos;s Meeting</p>
                  <p className="mt-1 text-[12px] text-neutral-500">
                    Meeting with marketing team
                  </p>
                </div>

                <PiVideoCamera className="size-5 text-[#838c08]" />
              </div>

              <div className="mt-5 flex items-end justify-between gap-2">
                <div>
                  <p className="mb-1 text-[12px] text-[#92938a]">People</p>

                  <div className="flex -space-x-2">
                    {["A", "J", "M", "S"].map((person, index) => (
                      <div
                        key={person}
                        className="flex size-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold text-[#55564c]"
                        style={{
                          backgroundColor: [
                            "#d9e7d4",
                            "#e9d9cf",
                            "#d8e6ef",
                            "#e6d9ed",
                          ][index],
                        }}
                      >
                        {person}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md bg-[#fdfeec] px-2 py-1 text-[11px] text-[#838c08]">
                  <PiClock className="mr-1 inline size-3" />
                  13:00–13:45
                </div>
              </div>
            </div>
          </div>

          {/* Assigned tasks */}
          <div className="w-full min-w-0 rounded-2xl bg-neutral-100 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.025)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-neutral-700">
                Tasks I&apos;ve assigned
              </h2>

              <button
                type="button"
                aria-label="Add assigned task"
                className="rounded-full border border-[#e8e8e1] p-1.5 hover:bg-[#f5f5f0] cursor-pointer"
              >
                <PiPlus className="size-3.5" />
              </button>
            </div>

            <div className="mb-3 flex gap-5 border-b border-[#efefe9]">
              {["Upcoming", "Overdue", "Completed"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 text-[13px] transition cursor-pointer ${
                    activeTab === tab
                      ? "border-b-2 border-[#838c08] font-medium text-[#838c08]"
                      : "text-neutral-500 hover:text-[#33342d]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              {visibleTasks.map((task, index) => (
                <div
                  key={task.title}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-primary/10 cursor-pointer"
                >
                  <div
                    className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[10px] font-semibold text-white"
                    style={{ backgroundColor: task.color }}
                  >
                    {index + 1}
                  </div>

                  <p className="min-w-0 flex-1 truncate text-[13px] text-neutral-600">
                    {task.title}
                  </p>

                  <div className="hidden w-1/3 max-w-36 items-center gap-2 sm:flex">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-300">
                      <div
                        className="h-full rounded-full bg-[#838c08]"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>

                    <span className="w-8 text-right text-[10px] text-[#66675f]">
                      {task.progress}%
                    </span>
                  </div>

                  <div className="flex shrink-0 -space-x-2">
                    {[0, 1]
                      .slice(0, index % 2 === 0 ? 2 : 1)
                      .map((n) => (
                        <div
                          key={n}
                          className="flex size-6 items-center justify-center rounded-full border border-[#fdfeec] bg-[#fdfeec] text-[8px] font-semibold text-neutral-700"
                        >
                          {n === 0 ? "A" : "M"}
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {visibleTasks.length === 0 && (
                <p className="py-6 text-center text-xs text-[#92938a]">
                  No tasks in this section yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
