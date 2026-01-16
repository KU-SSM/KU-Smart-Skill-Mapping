import { IconType } from 'react-icons'
import * as AiIcons from 'react-icons/ai'
import { TbCertificate } from 'react-icons/tb'
import { VscGraph, VscBook } from 'react-icons/vsc'
import { BsPersonLinesFill } from 'react-icons/bs'
import { LuChartLine } from 'react-icons/lu'
import { MdHome } from 'react-icons/md'
import { FaCertificate, FaBriefcase } from 'react-icons/fa'

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
        title: "Your Profile",
        link:"/profile",
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
        title: "Portfolio",
        link:"/portfolio",
        icon: FaBriefcase
    },
    {
        title: "Home",
        link:"/",
        icon: MdHome
    }
];

