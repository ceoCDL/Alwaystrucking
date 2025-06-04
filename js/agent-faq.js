/**
 * Agent Lee FAQ Database
 * This file contains frequently asked questions and answers for the Agent Lee assistant.
 */

const agentLeeFAQ = [
    {
        question: "What is Always Trucking and Loading LLC?",
        answer: "Always Trucking and Loading LLC is a training company for truckers, dispatchers, and logistics workers. We help you grow your skills and get certified with our comprehensive online training platform."
    },
    {
        question: "Do I need a CDL to start?",
        answer: "Not at all! We offer beginner-level training plus courses for seasoned CDL holders. Whatever your experience level, we have courses designed for you."
    },
    {
        question: "How do I track my progress?",
        answer: "By logging in to your account. Your dashboard tracks all courses, quiz scores, and certificates. You can pick up right where you left off anytime."
    },
    {
        question: "Is there a free trial course?",
        answer: "Yes! We provide sample lessons for each course so you can try out our training before committing. Look for the 'Preview' button on course pages."
    },
    {
        question: "Do I get a certificate when I finish?",
        answer: "Absolutely! You'll receive a signed, printable certificate of completion after passing the final quiz for each course."
    },
    {
        question: "Can I access this on my phone?",
        answer: "Yes. Our platform is fully responsive and works beautifully on mobile phones, tablets, and desktop computers."
    },
    {
        question: "What happens if I forget my password?",
        answer: "Click 'Forgot Password' on the login screen and follow the steps to reset it. You'll be back to learning in no time."
    },
    {
        question: "Can I study at my own pace?",
        answer: "Yes. All our courses are self-paced. You can start, pause, and continue anytime you want, fitting your training around your busy schedule."
    },
    {
        question: "Do courses expire?",
        answer: "Once enrolled, you have lifetime access to the course content and certificates. Learn and review the material whenever you need to."
    },
    {
        question: "Will there be new courses in the future?",
        answer: "Yes! We continuously add new training courses based on industry needs and regulatory changes to keep your skills current."
    },
    {
        question: "Can I preview what's in a course before buying?",
        answer: "Absolutely. Each course page has a free sample lesson so you know exactly what you're getting before you enroll."
    },
    {
        question: "What's the best way to begin if I'm brand new?",
        answer: "Start with our 'CDL Continuing Education' course for a solid foundation or try the 'Hours of Service & Logbook Compliance' course if you're focusing on regulations."
    },
    {
        question: "How long does each course take to complete?",
        answer: "Course durations range from 4 to 8 hours, but since they're self-paced, you can complete them as quickly or slowly as you need."
    },
    {
        question: "Are these courses DSPS compliant?",
        answer: "Yes, our courses are designed with DSPS compliance in mind. However, always check with your specific DSPS office for your particular situation and requirements."
    },
    {
        question: "Can I access course materials offline?",
        answer: "Yes, our training system works offline once the initial course content is loaded. This makes it perfect for drivers who may have limited connectivity on the road."
    },
    {
        question: "How do I contact support if I have problems?",
        answer: "You can reach our support team by email at training@alwaystrucking.com or by phone at 1-800-TRUCKING during business hours (Monday-Friday, 8AM-6PM EST)."
    },
    {
        question: "How many times can I take the quizzes?",
        answer: "You can take each quiz up to 3 times to achieve a passing score. If you need additional attempts, please contact our support team."
    },
    {
        question: "Do you offer group or company discounts?",
        answer: "Yes, we offer special pricing for fleet managers and companies training multiple employees. Contact us directly for custom quotes."
    },
    {
        question: "Can I get a refund if I'm not satisfied?",
        answer: "We offer a 30-day satisfaction guarantee. If you're not completely satisfied with your training, contact us for a full refund."
    },
    {
        question: "What devices are compatible with your training platform?",
        answer: "Our platform works on any device with a modern web browser, including smartphones, tablets, laptops, and desktop computers."
    }
];

// Function to search the FAQ for answers
function searchAgentLeeFAQ(query) {
    query = query.toLowerCase();
    
    // Try to find an exact match first
    const exactMatch = agentLeeFAQ.find(item => 
        item.question.toLowerCase().includes(query) || 
        query.includes(item.question.toLowerCase())
    );
    
    if (exactMatch) {
        return exactMatch.answer;
    }
    
    // If no exact match, look for keyword matches
    const keywords = query.split(' ').filter(word => word.length > 3);
    let bestMatch = null;
    let highestScore = 0;
    
    agentLeeFAQ.forEach(item => {
        const questionLower = item.question.toLowerCase();
        let score = 0;
        
        keywords.forEach(keyword => {
            if (questionLower.includes(keyword)) {
                score += 1;
            }
        });
        
        if (score > highestScore) {
            highestScore = score;
            bestMatch = item;
        }
    });
    
    if (bestMatch && highestScore > 0) {
        return bestMatch.answer;
    }
    
    // No good match found
    return null;
}