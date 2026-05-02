export type InterviewerId = 'priya' | 'arjun';

export type Interviewer = {
  id: InterviewerId;
  name: string;
  role: string;
  avatarImage: string;
  video: string;
  voiceId: 'female_voice_id' | 'male_voice_id';
  gender: 'male' | 'female';
};

export const interviewers: Interviewer[] = [
  {
    id: 'priya',
    name: 'Priya',
    role: 'Senior Recruiter',
    avatarImage: '/avatars/female/female-avatar.png',
    video: '/avatars/female/female-ai.mp4',
    voiceId: 'female_voice_id',
    gender: 'female',
  },
  {
    id: 'arjun',
    name: 'Arjun',
    role: 'Technical Lead',
    avatarImage: '/avatars/male/male-avatar.png',
    video: '/avatars/male/male-ai.mp4',
    voiceId: 'male_voice_id',
    gender: 'male',
  },
];

export const INTERVIEWER_IDS = interviewers.map((item) => item.id) as [InterviewerId, ...InterviewerId[]];

export function getInterviewerById(id: string | null | undefined): Interviewer | undefined {
  if (!id) return undefined;
  return interviewers.find((item) => item.id === id);
}
