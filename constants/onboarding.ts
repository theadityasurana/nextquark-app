export const AuthColors = {
    bg: '#FFFFFF',
    bgGradientMid: '#FFFFFF',
    bgGradientEnd: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceHover: '#EEEEEE',
    border: '#E0E0E0',
    borderFocus: '#111111',
    accent: '#111111',
    accentSoft: 'rgba(0, 0, 0, 0.06)',
    accentDark: '#000000',
    success: '#10B981',
    successSoft: 'rgba(16, 185, 129, 0.1)',
    error: '#EF4444',
    errorSoft: 'rgba(239, 68, 68, 0.1)',
    text: '#111111',
    textSecondary: '#616161',
    textMuted: '#9E9E9E',
    chipBg: 'rgba(0, 0, 0, 0.06)',
    chipBorder: 'rgba(0, 0, 0, 0.2)',
    chipSelectedBg: '#111111',
    gold: '#F59E0B',
    goldSoft: 'rgba(245, 158, 11, 0.1)',
  };
  
  export const countryCodes = [
    { code: '+1', country: 'United States', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+1', country: 'Canada', flag: '🇨🇦' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
  ];
  
  export const suggestedSkills = [
    'JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js',
    'Python', 'Java', 'Swift', 'Kotlin', 'Go', 'Rust', 'C++',
    'AWS', 'Docker', 'Kubernetes', 'GraphQL', 'REST APIs',
    'PostgreSQL', 'MongoDB', 'Redis', 'Figma', 'UI/UX Design',
    'Product Management', 'Data Science', 'Machine Learning',
    'DevOps', 'CI/CD', 'Agile', 'Scrum', 'Git', 'SQL',
    'HTML/CSS', 'Vue.js', 'Angular', 'Django', 'Flask',
    'Spring Boot', 'TensorFlow', 'PyTorch', 'Tableau', 'Power BI',
  ];
  
  export const employmentTypes = [
    'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance',
  ];
  
  export const degreeTypes = [
    'High School', "Associate's", "Bachelor's", "Master's", 'PhD', 'MBA', 'Other',
  ];
  
  export const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  ];
  
  export const suggestedRoles = [
  // Software & Engineering
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer', 'DevOps Engineer', 'Data Scientist', 'Machine Learning Engineer',
  'Cloud Architect', 'Security Engineer', 'QA Engineer', 'Systems Architect',
  'Engineering Manager', 'CTO', 'VP of Engineering', 'Technical Lead',
  // Product
  'Product Manager', 'Senior Product Manager', 'Product Owner', 'Technical Product Manager',
  'VP of Product', 'Chief Product Officer', 'Product Analyst', 'Product Designer',
  'Product Operations Manager', 'Product Marketing Manager',
  // Design
  'UX Designer', 'UI Designer', 'UX/UI Designer', 'Graphic Designer',
  'Brand Designer', 'Motion Designer', 'Design Lead', 'Creative Director',
  // Marketing
  'Marketing Manager', 'Digital Marketing Manager', 'Content Marketing Manager',
  'Growth Marketing Manager', 'Performance Marketing Manager', 'SEO Specialist',
  'Social Media Manager', 'Brand Manager', 'Marketing Director', 'CMO',
  'Email Marketing Specialist', 'Marketing Analyst', 'Demand Generation Manager',
  'Field Marketing Manager', 'Content Strategist',
  'Copywriter', 'Marketing Operations Manager',
  // Sales
  'Sales Representative', 'Account Executive', 'Sales Manager', 'Business Development Manager',
  'Sales Director', 'VP of Sales', 'Chief Revenue Officer', 'Inside Sales Representative',
  'Outside Sales Representative', 'Sales Engineer', 'Solutions Consultant',
  'Enterprise Account Executive', 'Customer Success Manager', 'Account Manager',
  'Sales Operations Manager', 'Revenue Operations Manager',
  // Growth
  'Growth Manager', 'Growth Lead', 'Growth Hacker', 'VP of Growth',
  'User Acquisition Manager', 'Retention Manager', 'Conversion Rate Optimizer',
  'Growth Product Manager', 'Growth Analyst', 'Lifecycle Marketing Manager',
  // Data & Analytics
  'Data Analyst', 'Business Intelligence Analyst', 'Analytics Manager',
  'Data Engineer', 'Business Analyst', 'Operations Analyst',
  // Operations
  'Operations Manager', 'Chief Operating Officer', 'Program Manager',
  'Project Manager', 'Scrum Master', 'Agile Coach',
  // HR & Recruiting
  'Recruiter', 'Technical Recruiter', 'HR Manager', 'Talent Acquisition Manager',
  'People Operations Manager', 'Chief People Officer',
  // Finance
  'Financial Analyst', 'Accountant', 'Finance Manager', 'CFO',
  // Customer Support
  'Customer Support Specialist', 'Support Manager',
  // Other
  'Technical Writer', 'Community Manager', 'Partnerships Manager',
];
  
  export const majorCities = [
  // United States
  'San Francisco, CA, USA', 'New York, NY, USA', 'Seattle, WA, USA', 'Austin, TX, USA',
  'Los Angeles, CA, USA', 'Chicago, IL, USA', 'Boston, MA, USA', 'Denver, CO, USA',
  'Portland, OR, USA', 'Miami, FL, USA', 'Atlanta, GA, USA', 'Dallas, TX, USA',
  'Houston, TX, USA', 'Phoenix, AZ, USA', 'San Diego, CA, USA', 'Philadelphia, PA, USA',
  'Washington, DC, USA', 'Nashville, TN, USA', 'Detroit, MI, USA', 'Minneapolis, MN, USA',
  // Canada
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
  'Ottawa, Canada', 'Edmonton, Canada', 'Winnipeg, Canada',
  // United Kingdom
  'London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Bristol, UK',
  'Leeds, UK', 'Glasgow, UK', 'Liverpool, UK', 'Cambridge, UK', 'Oxford, UK',
  // Germany
  'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany', 'Hamburg, Germany', 'Cologne, Germany',
  // Netherlands
  'Amsterdam, Netherlands', 'Rotterdam, Netherlands', 'The Hague, Netherlands', 'Utrecht, Netherlands',
  // France
  'Paris, France', 'Lyon, France', 'Marseille, France', 'Toulouse, France', 'Nice, France',
  // Europe (Other)
  'Barcelona, Spain', 'Madrid, Spain', 'Lisbon, Portugal', 'Porto, Portugal',
  'Rome, Italy', 'Milan, Italy', 'Stockholm, Sweden', 'Copenhagen, Denmark',
  'Oslo, Norway', 'Helsinki, Finland', 'Vienna, Austria', 'Zurich, Switzerland',
  'Geneva, Switzerland', 'Brussels, Belgium', 'Prague, Czech Republic', 'Warsaw, Poland',
  'Dublin, Ireland', 'Athens, Greece', 'Budapest, Hungary',
  // Middle East
  'Dubai, UAE', 'Abu Dhabi, UAE', 'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
  'Doha, Qatar', 'Kuwait City, Kuwait', 'Muscat, Oman', 'Manama, Bahrain',
  'Tel Aviv, Israel', 'Jerusalem, Israel', 'Amman, Jordan', 'Beirut, Lebanon',
  // India
  'Bangalore, India', 'Mumbai, India', 'Delhi, India', 'Hyderabad, India', 'Pune, India',
  'Chennai, India', 'Kolkata, India', 'Gurugram, India', 'Noida, India', 'Ahmedabad, India',
  'Jaipur, India', 'Chandigarh, India', 'Kochi, India',
  // Southeast Asia
  'Singapore', 'Bangkok, Thailand', 'Jakarta, Indonesia', 'Kuala Lumpur, Malaysia',
  'Manila, Philippines', 'Ho Chi Minh City, Vietnam', 'Hanoi, Vietnam',
  'Yangon, Myanmar', 'Phnom Penh, Cambodia', 'Bali, Indonesia',
  // Australia & Others
  'Sydney, Australia', 'Melbourne, Australia', 'Tokyo, Japan', 'Seoul, South Korea',
];
  
  export const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  
  export const years = Array.from({ length: 47 }, (_, i) => String(2026 - i));
  
  export const jobTitleSuggestions = [
  // Tech
  'Software Engineer', 'Senior Software Engineer', 'Staff Engineer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Mobile Developer', 'iOS Developer', 'Android Developer',
  'DevOps Engineer', 'SRE', 'Cloud Engineer',
  'Data Scientist', 'ML Engineer', 'AI Researcher',
  'Engineering Manager', 'Tech Lead', 'Architect',
  // Product
  'Product Manager', 'Technical Product Manager', 'Senior Product Manager',
  'Product Owner', 'VP of Product', 'Chief Product Officer',
  // Design
  'UX Designer', 'UI Designer', 'Product Designer', 'Graphic Designer',
  // Marketing
  'Marketing Manager', 'Digital Marketing Manager', 'Content Marketing Manager',
  'Growth Marketing Manager', 'SEO Specialist', 'Social Media Manager',
  'Brand Manager', 'Marketing Director',
  // Sales
  'Sales Representative', 'Account Executive', 'Sales Manager',
  'Business Development Manager', 'Sales Director',
  // Growth
  'Growth Manager', 'Growth Engineer', 'Growth Lead', 'Growth Hacker',
];
  