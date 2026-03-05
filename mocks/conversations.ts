import { Conversation, Message } from '@/types';

export const mockConversations: Conversation[] = [
  {
    id: 'c1',
    companyName: 'Stripe',
    companyLogo: 'https://logo.clearbit.com/stripe.com',
    recruiterName: 'Sarah Chen',
    jobTitle: 'Senior Frontend Engineer',
    lastMessage: 'Hi Alex, We reviewed your profile and your experience with React and TypeScript is really impressive. We would love to schedule a call this week.',
    lastMessageTime: '2h ago',
    unreadCount: 1,
    isOnline: true,
    category: 'new',
  },
  {
    id: 'c2',
    companyName: 'Airbnb',
    companyLogo: 'https://logo.clearbit.com/airbnb.com',
    recruiterName: 'Mike Johnson',
    jobTitle: 'Product Designer',
    lastMessage: 'Congratulations! Your interview is confirmed for Feb 25th at 2pm PST. Please find the meeting link attached.',
    lastMessageTime: '1d ago',
    unreadCount: 0,
    isOnline: false,
    category: 'follow_up',
  },
  {
    id: 'c3',
    companyName: 'Linear',
    companyLogo: 'https://logo.clearbit.com/linear.app',
    recruiterName: 'Emma Williams',
    jobTitle: 'Mobile Engineer (React Native)',
    lastMessage: 'We would love to move forward with your application! Please complete the attached assessment within 5 business days.',
    lastMessageTime: '3d ago',
    unreadCount: 2,
    isOnline: true,
    category: 'new',
  },
  {
    id: 'c4',
    companyName: 'Vercel',
    companyLogo: 'https://logo.clearbit.com/vercel.com',
    recruiterName: 'Alex Rivera',
    jobTitle: 'Developer Experience Engineer',
    lastMessage: 'Thanks for applying! Our team is currently reviewing your application and we will get back to you within the next 5-7 business days.',
    lastMessageTime: '5d ago',
    unreadCount: 0,
    isOnline: false,
    category: 'follow_up',
  },
];

export const mockMessages: Record<string, Message[]> = {
  c1: [
    { id: 'msg1', senderId: 'recruiter', text: 'Hi Alex,\n\nThank you for your interest in the Senior Frontend Engineer position at Stripe.\n\nWe reviewed your profile and your experience with React and TypeScript is really impressive!\n\nWould you be available for a quick chat this week? We have openings on Tuesday and Thursday afternoon.\n\nBest regards,\nSarah Chen\nTalent Acquisition, Stripe', timestamp: '10:30 AM', isRead: true, isDelivered: true },
    { id: 'msg3', senderId: 'user', text: 'Hi Sarah,\n\nThank you so much for reaching out! I have been following Stripe\'s work and I am really excited about this opportunity.\n\nTuesday afternoon works great for me. Please let me know the time and I will block my calendar.\n\nBest,\nAlex', timestamp: '10:45 AM', isRead: true, isDelivered: true },
    { id: 'msg4', senderId: 'recruiter', text: 'Hi Alex,\n\nGreat! Let\'s schedule for Tuesday at 3pm PST. I\'ll send you a Google Meet link shortly.\n\nLooking forward to speaking with you!\n\nBest,\nSarah', timestamp: '11:00 AM', isRead: false, isDelivered: true },
  ],
  c2: [
    { id: 'msg5', senderId: 'recruiter', text: 'Hello Alex,\n\nCongratulations on being selected for the next round of interviews at Airbnb!\n\nWe were very impressed with your portfolio and design thinking approach.\n\nBest regards,\nMike Johnson\nDesign Recruiting, Airbnb', timestamp: 'Feb 17', isRead: true, isDelivered: true },
    { id: 'msg6', senderId: 'user', text: 'Hi Mike,\n\nThat\'s wonderful news! I\'m really looking forward to it.\n\nBest,\nAlex', timestamp: 'Feb 17', isRead: true, isDelivered: true },
    { id: 'msg7', senderId: 'recruiter', text: 'Hi Alex,\n\nYour interview is confirmed for Feb 25th at 2pm PST. You\'ll be meeting with our Head of Design, Lisa Park.\n\nPlease find the Google Meet link below:\nhttps://meet.google.com/abc-defg-hij\n\nGood luck!\nMike', timestamp: 'Feb 18', isRead: true, isDelivered: true },
  ],
  c3: [
    { id: 'msg8', senderId: 'recruiter', text: 'Hi Alex,\n\nYour React Native experience caught our eye at Linear. We\'re building something special and think you\'d be a great fit.\n\nWould you be interested in learning more about the role?\n\nBest,\nEmma Williams\nEngineering, Linear', timestamp: 'Feb 15', isRead: true, isDelivered: true },
    { id: 'msg9', senderId: 'user', text: 'Hi Emma,\n\nThanks for reaching out! Linear is one of my favorite products. Would love to contribute.\n\nBest,\nAlex', timestamp: 'Feb 15', isRead: true, isDelivered: true },
    { id: 'msg10', senderId: 'recruiter', text: 'Hi Alex,\n\nWe would love to move forward with your application! Are you available next week for a technical interview?\n\nWe have slots on Tuesday and Thursday afternoon.\n\nBest,\nEmma', timestamp: 'Feb 16', isRead: false, isDelivered: true },
  ],
};
