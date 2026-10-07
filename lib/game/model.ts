export type Role = 'wolf' | 'seer' | 'witch' | 'hunter' | 'villager' | 'guard';
export const ROLES: Record<Role, {
    name: string;
    team: string;
    ability: string;
    tip: string;
    art: number;
}> = {
    wolf: { name: '狼人', team: '狼人阵营', ability: '夜晚与同伴统一袭击目标。白天隐藏身份，争取信任。', tip: '统一目标才会生效。可以选择空刀，也可以自刀。', art: 0 },
    seer: { name: '预言家', team: '好人阵营', ability: '每晚查验一名其他存活玩家，得知其是否为狼人。', tip: '查验只告诉你狼人或好人，不显示具体身份。', art: 1 },
    witch: { name: '女巫', team: '好人阵营', ability: '整局各有一瓶解药和毒药。每晚最多使用一瓶。', tip: '不能自救。解药用尽后，不再得知狼人的袭击目标。', art: 2 },
    hunter: { name: '猎人', team: '好人阵营', ability: '被狼人袭击或白天放逐出局时，可以带走一名玩家。', tip: '被毒杀不能开枪。开枪前，你的身份会公开。', art: 3 },
    villager: { name: '村民', team: '好人阵营', ability: '白天听取发言、比较票型，通过投票找出狼人。', tip: '没有夜间技能。发言和投票是你的武器。', art: 4 },
    guard: { name: '守卫', team: '好人阵营', ability: '每晚守护一人，可以守护自己，不能连续两晚守同一人。', tip: '同守同救会失效。守护无法挡住女巫的毒药。', art: 5 },
};
export const PRESETS = {
    quick: { name: '6 人快速局', size: 6, roles: ['wolf', 'wolf', 'seer', 'witch', 'villager', 'villager'] as Role[], victory: 'parity', description: '2 狼 · 预言家 · 女巫 · 2 村民', rule: '好人消灭所有狼人获胜；狼人存活数达到好人数获胜。' },
    classic: { name: '9 人标准局', size: 9, roles: ['wolf', 'wolf', 'wolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager'] as Role[], victory: 'town', description: '3 狼 · 预言家 · 女巫 · 猎人 · 3 村民', rule: '好人消灭所有狼人获胜；狼人消灭所有好人获胜（屠城）。' },
    guard: { name: '12 人守卫局', size: 12, roles: ['wolf', 'wolf', 'wolf', 'wolf', 'seer', 'witch', 'hunter', 'guard', 'villager', 'villager', 'villager', 'villager'] as Role[], victory: 'edge', description: '4 狼 · 4 神 · 4 村民', rule: '好人消灭所有狼人获胜；狼人消灭全部村民或全部神职获胜（屠边）。' },
} as const;
export type Preset = keyof typeof PRESETS;
export type Phase = 'lobby' | 'identity' | 'nightGuard' | 'nightWolf' | 'nightWitch' | 'nightSeer' | 'dawn' | 'speech' | 'vote' | 'hunter' | 'lastWords' | 'finished';
export const PHASE_NAMES: Record<Phase, string> = { lobby: '等待入座', identity: '确认身份', nightGuard: '守卫行动', nightWolf: '狼人行动', nightWitch: '女巫行动', nightSeer: '预言家行动', dawn: '天亮了', speech: '轮流发言', vote: '放逐投票', hunter: '猎人开枪', lastWords: '遗言', finished: '本局结束' };
export type Player = {
    id: string;
    token: string;
    name: string;
    bot: boolean;
    ready: boolean;
    alive: boolean;
    role?: Role;
    lastChat: number;
};
export type Message = {
    id: string;
    author: string;
    name: string;
    text: string;
    channel: 'public' | 'wolves';
    day: number;
    at: number;
};
export type Ballot = {
    day: number;
    pk: boolean;
    votes: {
        voter: string;
        target: string | null;
    }[];
    eliminated: string | null;
};
export type Check = {
    day: number;
    target: string;
    wolf: boolean;
};
export type Death = {
    id: string;
    cause: 'wolf' | 'poison' | 'vote' | 'shot';
};
export type Room = {
    code: string;
    host: string;
    preset: Preset;
    players: Player[];
    spectators: Player[];
    phase: Phase;
    day: number;
    deadline: number;
    phaseStarted: number;
    created: number;
    speechSeconds: number;
    nightSeconds: number;
    choices: Record<string, string>;
    night: {
        guard?: string;
        kill?: string;
        save?: boolean;
        poison?: string;
    };
    lastGuard?: string;
    potions: {
        save: boolean;
        poison: boolean;
    };
    checks: Record<string, Check[]>;
    logs: {
        id: string;
        day: number;
        text: string;
    }[];
    messages: Message[];
    ballots: Ballot[];
    queue: string[];
    tied: string[];
    pk: boolean;
    deaths: Death[];
    hunters: string[];
    words: string[];
    afterDeaths: 'day' | 'night';
    publicRoles: Record<string, Role>;
    winner?: 'good' | 'wolves' | 'draw';
    winReason?: string;
};
export const NONE = 'none';
export type Seat = {
    id: string;
    name: string;
    bot: boolean;
    ready: boolean;
    alive: boolean;
    seat: number;
    role?: Role;
};
export type GameView = {
    code: string;
    host: string;
    preset: Preset;
    players: Seat[];
    spectators: {
        id: string;
        name: string;
    }[];
    phase: Phase;
    day: number;
    deadline: number;
    serverNow: number;
    you: string;
    isSpectator: boolean;
    myRole?: Role;
    myAlive: boolean;
    myChoice?: string;
    checks: Check[];
    potions?: {
        save: boolean;
        poison: boolean;
    };
    wolfTarget?: string;
    wolfVotes?: {
        name: string;
        target: string;
    }[];
    options: {
        value: string;
        label: string;
    }[];
    canAct: boolean;
    canChat: boolean;
    chatChannel: 'public' | 'wolves';
    speaker?: string;
    logs: Room['logs'];
    messages: Message[];
    ballots: Ballot[];
    pk: boolean;
    tied: string[];
    winner?: Room['winner'];
    winReason?: string;
    speechSeconds: number;
    nightSeconds: number;
};
