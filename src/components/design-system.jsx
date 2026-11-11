'use client';

import { useRef, useState } from 'react';
import {
  ArrowUp,
  Bot,
  Check,
  ChevronLeft,
  MoreHorizontal,
  Paperclip,
  Sparkles,
} from 'lucide-react';

const questions = [
  {
    label: 'Study destination',
    prompt: 'Where are you hoping to study?',
    options: ['United States', 'United Kingdom', 'Canada', 'Australia'],
    fallback: 'I’m open to suggestions',
  },
  {
    label: 'Intended course',
    prompt: 'What would you like to study?',
    options: ['Computer Science', 'Engineering', 'Business', 'Economics', 'Design', 'Medicine'],
    fallback: 'Still exploring',
  },
  {
    label: 'School grade',
    prompt: 'Which grade are you in right now?',
    options: ['Class 11', 'Class 12', 'Gap year', 'Other'],
    fallback: 'Not sure yet',
  },
  {
    label: 'Academic profile',
    prompt: 'What is your current GPA or percentage?',
    options: [],
    placeholder: 'Enter your GPA or percentage',
    fallback: 'I don’t have it yet',
  },
  {
    label: 'Test plans',
    prompt: 'Which entrance tests have you taken or are planning to take?',
    options: ['SAT', 'ACT', 'GRE', 'IELTS', 'TOEFL'],
    fallback: 'I haven’t decided',
  },
  {
    label: 'Budget',
    prompt: 'What budget feels comfortable for your first year?',
    options: ['Under ₹10 lakh', '₹10–25 lakh', '₹25–40 lakh', '₹40 lakh+'],
    fallback: 'Show me ranges',
  },
  {
    label: 'Study goals',
    prompt: 'What matters most in your college experience?',
    options: ['Research', 'Career outcomes', 'Affordability', 'Campus life'],
    fallback: 'A mix of everything',
  },
  {
    label: 'Anything else',
    prompt: 'Anything else you want your counselor to know?',
    options: [],
    placeholder: 'Share a goal, question, or detail…',
    fallback: 'Nothing else for now',
  },
];

const referenceFlow = [
  {
    label: 'Area of study · Chips + dropdown',
    prompt: 'What do you want to study for your master’s?',
    options: ['Data Science', 'Computer Science', 'Business Analytics', 'Finance'],
    answer: 'Data Science',
  },
  {
    label: 'Country · Selection cards',
    prompt: 'Which countries are you looking at?',
    options: ['USA', 'UK', 'Germany', 'Canada'],
    answer: 'USA, Germany',
  },
  {
    label: 'Intake · Chips',
    prompt: 'When do you want to start?',
    options: ['Fall', 'Spring', '2027', '2028'],
    answer: 'Fall 2027',
  },
  {
    label: 'Work experience · Free text',
    prompt: 'How much work experience do you have? 0 is a fine answer.',
    input: '1 year 6 months',
    answer: '1 year 6 months',
  },
  {
    label: 'Current profession · Free text',
    prompt:
      'What do you do right now? Role, function and industry. Students can just say “student”.',
    input: 'Design engineer, automotive',
    answer: 'Design engineer, automotive',
  },
  ...questions.map((question) => ({
    label: question.label,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer || question.fallback,
    input: question.placeholder,
  })),
];

export function DesignSystem() {
  const [answers, setAnswers] = useState([]);
  const [draft, setDraft] = useState('');
  const conversationRef = useRef(null);

  function answer(value, index = answers.length) {
    if (!value.trim()) return;
    setAnswers((previous) =>
      index < previous.length
        ? previous.map((existing, i) => (i === index ? value.trim() : existing))
        : [...previous, value.trim()],
    );
    setDraft('');
    requestAnimationFrame(() =>
      conversationRef.current?.scrollTo({
        top: conversationRef.current.scrollHeight,
        behavior: 'smooth',
      }),
    );
  }

  const active = referenceFlow[Math.min(answers.length, referenceFlow.length - 1)];
  return (
    <main className="content design-system-page ai-chat-test-page">
      <div className="ai-chat-test-wrap">
        <section className="ai-chat-phone" aria-label="GradRight AI chat">
          <header className="ai-chat-topbar">
            <button
              className="ai-chat-back"
              type="button"
              aria-label="Back"
              onClick={() => conversationRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ChevronLeft size={19} />
            </button>
            <span className="ai-chat-brand-icon">
              <Bot size={18} />
            </span>
            <div className="ai-chat-title">
              <strong>GradRight Assistant</strong>
              <span>
                <i /> Building your study profile
              </span>
            </div>
            <button className="ai-chat-more" type="button" aria-label="More options">
              <MoreHorizontal size={20} />
            </button>
          </header>
          <div className="ai-chat-progress">
            <span style={{ width: `${(answers.length / referenceFlow.length) * 100}%` }} />
          </div>
          <div className="ai-chat-conversation" ref={conversationRef}>
            <div className="ai-chat-day">TODAY</div>
            <div className="ai-chat-welcome">
              <Sparkles size={14} />
              <span>
                Hi! I’m your GradRight AI assistant. I’ll ask a few quick questions to build your
                study profile. You can skip anything you’re unsure about.
              </span>
            </div>
            {answers.map((value, index) => (
              <div className="ai-chat-turn" key={index}>
                <div className="ai-chat-step-meta">
                  <span>
                    QUESTION {index + 1} · {referenceFlow[index].label.toUpperCase()}
                  </span>
                  <span>{Math.round(((index + 1) / referenceFlow.length) * 100)}%</span>
                </div>
                <div className="ai-chat-message">
                  <span className="ai-chat-avatar">
                    <Bot size={13} />
                  </span>
                  <p>{referenceFlow[index].prompt}</p>
                </div>
                <div className="ai-chat-user-answer">
                  {value}
                  <Check size={13} />
                </div>
              </div>
            ))}
            {active ? (
              <div className="ai-chat-turn ai-chat-active-turn">
                <div className="ai-chat-step-meta">
                  <span>
                    QUESTION {answers.length + 1} · {active.label.toUpperCase()}
                  </span>
                  <span>{Math.round((answers.length / referenceFlow.length) * 100)}%</span>
                </div>
                <div className="ai-chat-message">
                  <span className="ai-chat-avatar">
                    <Bot size={13} />
                  </span>
                  <p>{active.prompt}</p>
                </div>
                {active.options?.length ? (
                  <div className="ai-chat-options" role="group" aria-label={active.prompt}>
                    {active.options.map((option) => (
                      <button key={option} type="button" onClick={() => answer(option)}>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    className="ai-chat-inline-input"
                    placeholder={active.input}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && answer(draft)}
                  />
                )}
                <button
                  className="ai-chat-skip"
                  type="button"
                  onClick={() => answer(active.fallback || 'Skip for now')}
                >
                  {active.fallback || 'Skip for now'}
                </button>
              </div>
            ) : (
              <div className="ai-chat-welcome">
                <Sparkles size={14} />
                <span>
                  That’s a great start. Your counselor can use this profile to tailor your next
                  steps.
                </span>
              </div>
            )}
          </div>
          <form
            className="ai-chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              answer(draft);
            }}
          >
            <button type="button" className="ai-chat-attach" aria-label="Add attachment">
              <Paperclip size={17} />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your answer…"
              aria-label="Type your answer"
            />
            <button type="submit" aria-label="Send answer">
              <ArrowUp size={17} />
            </button>
          </form>
          <div className="ai-chat-footer">
            GradRight AI can make mistakes. Your counselor reviews your profile.
          </div>
        </section>
        <p className="ai-chat-caption">A conversational study profile, one question at a time.</p>
      </div>
    </main>
  );
}
