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
    name: 'Meera',
    role: 'Senior Recruiter',
    avatarImage: '/avatars/female/meera-avatar.png',
    video: '/avatars/female/meera-ai.mp4',
    voiceId: 'female_voice_id',
    gender: 'female',
  },
  {
    id: 'arjun',
    name: 'Rohan',
    role: 'Technical Lead',
    avatarImage: '/avatars/male/rohan-avatar.png',
    video: '/avatars/male/rohan-ai.mp4',
    voiceId: 'male_voice_id',
    gender: 'male',
  },
];

export const INTERVIEWER_IDS = interviewers.map((item) => item.id) as [InterviewerId, ...InterviewerId[]];

export function getInterviewerById(id: string | null | undefined): Interviewer | undefined {
  if (!id) return undefined;
  return interviewers.find((item) => item.id === id);
}
