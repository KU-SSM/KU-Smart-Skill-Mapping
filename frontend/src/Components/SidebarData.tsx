import { IconType } from 'react-icons'
import * as AiIcons from 'react-icons/ai'
import { TbCertificate } from 'react-icons/tb'
import { VscGraph, VscBook } from 'react-icons/vsc'
import { BsPersonLinesFill } from 'react-icons/bs'
import { LuChartLine } from 'react-icons/lu'
import { MdHome } from 'react-icons/md'
import { FaCertificate, FaBriefcase } from 'react-icons/fa'
import { AiOutlineCheckSquare } from 'react-icons/ai'

export interface SidebarItem {
    title: string;
    link: string;
    icon: IconType;
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
        icon: BsPersonLinesFill
    },
    {
        title: "Your Profile (Student)",
        link:"/profile2",
        icon: BsPersonLinesFill
    },
    {
        title: "Your Profile (Teacher)",
        link:"/profile3",
        icon: BsPersonLinesFill
    },
    {
        title: "Skill Map",
        link:"/skill_map",
        icon: AiIcons.AiOutlineRadarChart
    },
    {
        title: "Certificate",
        link:"/certificate",
        icon: FaCertificate
    },
    {
        title: "Rubric Score (Teacher)",
        link:"/rubric_score",
        icon: AiOutlineCheckSquare
    },
    {
        title: "Rubric Score (Student)",
        link:"/rubric_score_student",
        icon: AiOutlineCheckSquare
    },
    {
        title: "Home",
        link:"/",
        icon: MdHome
    }
];

