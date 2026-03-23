import { IconType } from 'react-icons'
import * as AiIcons from 'react-icons/ai'
import { TbCertificate } from 'react-icons/tb'
import { VscGraph, VscBook } from 'react-icons/vsc'
import { BsPersonLinesFill } from 'react-icons/bs'
import { LuChartLine } from 'react-icons/lu'
import { MdHome } from 'react-icons/md'
import { FaCertificate } from 'react-icons/fa'
import { AiOutlineCheckSquare } from 'react-icons/ai'

/** Who sees this link until real auth exists. Default: everyone. `none` = hidden for all. */
export type SidebarAudience = 'all' | 'student' | 'teacher' | 'none';

export interface SidebarItem {
    title: string;
    link: string;
    icon: IconType;
    /** Omit or 'all' = both roles; 'none' = never show */
    audience?: SidebarAudience;
}

export const SideBarData: SidebarItem[] = [
    {
        title: "Courses & Skills",
        link:"/courses_and_skills",
        icon: TbCertificate
    },
    {
        title: "Jobs & Skills",
        link:"/jobs_and_skills",
        icon: VscGraph
    },
    {
        title: "Recommend Course",
        link:"/recommend_course",
        icon: VscBook
    },
    {
        title: "Export Chart",
        link:"/export_chart",
        icon: LuChartLine
    },
    {
        title: "Your Profile (Old)",
        link:"/profile",
        icon: BsPersonLinesFill,
        audience: 'none',
    },
    {
        title: "Evaluation",
        link:"/profile2",
        icon: BsPersonLinesFill,
        audience: 'student',
    },
    {
        title: "Evaluation",
        link:"/profile3",
        icon: BsPersonLinesFill,
        audience: 'teacher',
    },
    {
        title: "Skill Map",
        link:"/skill_map",
        icon: AiIcons.AiOutlineRadarChart,
        audience: 'student',
    },
    {
        title: "Certificate",
        link:"/certificate",
        icon: FaCertificate
    },
    {
        title: "Rubric Score",
        link:"/rubric_score",
        icon: AiOutlineCheckSquare,
        audience: 'teacher',
    },
    {
        title: "Rubric Score",
        link:"/rubric_score_student",
        icon: AiOutlineCheckSquare,
        audience: 'student',
    },
    {
        title: "Home",
        link:"/",
        icon: MdHome
    }
];

