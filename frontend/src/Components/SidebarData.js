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
        icon: <TbCertificate />
    },
    {
        title: "Jobs & Skills",
        icon: <VscGraph />
    },
    {
        title: "Recommend Course",
        icon: <VscBook />
    },
    {
        title: "Export Chart",
        icon: <LuChartLine />
    },
    {
        title: "Your Profile",
        icon: <BsPersonLinesFill />
    },
    {
        title: "Skill Map",
        icon: <AiIcons.AiOutlineRadarChart />
    },
    {
        title: "Home",
        icon: <MdHome />
    }
];
