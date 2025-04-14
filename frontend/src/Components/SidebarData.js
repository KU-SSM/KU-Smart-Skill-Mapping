import React from 'react'
import * as AiIcons from 'react-icons/ai'
import { TbCertificate } from 'react-icons/tb'
import { VscGraph, VscBook } from 'react-icons/vsc'
import { BsPersonLinesFill } from 'react-icons/bs'
import { LuChartLine } from 'react-icons/lu'
import { MdHome } from 'react-icons/md'

export const SideBarData = [
    {
        title: "Courses & Skills",
        link:"/courses_and_skills",
        icon: <TbCertificate />
    },
    {
        title: "Jobs & Skills",
        link:"/jobs_and_skills",
        icon: <VscGraph />
    },
    {
        title: "Recommend Course",
        link:"/recommend_course",
        icon: <VscBook />
    },
    {
        title: "Export Chart",
        link:"/export_chart",
        icon: <LuChartLine />
    },
    {
        title: "Your Profile",
        link:"/profile",
        icon: <BsPersonLinesFill />
    },
    {
        title: "Skill Map",
        link:"/skill_map",
        icon: <AiIcons.AiOutlineRadarChart />
    },
    {
        title: "Home",
        link:"/",
        icon: <MdHome />
    }
];
