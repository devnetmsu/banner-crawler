import { BannerInstance, BannerConfig } from "./banner";

interface CourseResult {
    campus: string
    code: string
    registrationNumber: string
    title: string
    type: string
    deliveryMethod: string
    gradeMode: string
    credits: string
    days: string
    times: string
    location: string
    instructor: string
}

interface Course {
    code: string,
    days: string,
    times: string,
    location: string,
    instructor: string,
    credits: number
}

enum CellMap {
    campus,
    partOfTerm,
    code,
    section,
    registrationNumber,
    title,
    syllabus,
    type,
    deliveryMethod,
    gradeMode,
    credits,
    progressGrade,
    progressGradeDate,
    finalGrade,
    lateCount,
    absenses,
    days,
    times,
    location,
    instructor
}

export class Schedule {
    config: BannerConfig;
    constructor(config: BannerConfig) {
        this.config = config;
    }
    async run(): Promise<Course[]> {
        const banner = new BannerInstance(this.config);
        const { browser, page } = await banner.open();

        await page.goto('https://my.msstate.edu/web/home-community/banner', { waitUntil: 'networkidle0' });
        await page.goto('https://mybanner.msstate.edu/prod/wwskosst.P_SelectTerm', { waitUntil: 'networkidle0' });
        await page.click('input[value="View Class Schedule"]');
        await page.waitFor('.msu_table_wb');

        const courseResults: CourseResult[] = await page.evaluate((cellMap) => {
            console.log(cellMap);
            const results: CourseResult[] = [];
            const tableSearch = document.getElementsByClassName('msu_table_wb');
            const schedTable: HTMLTableElement = <HTMLTableElement>tableSearch[0];
            const rows = schedTable.rows;
            for (let i = 2; i < rows.length - 1; i++) {
                const row = rows[i];
                const cells = row.cells;
                console.log(cellMap.campus);
                console.log(cellMap.title);
                console.log(cells);
                const course: CourseResult = {
                    campus: cells[cellMap.campus].innerText,
                    code: cells[cellMap.code].innerText,
                    registrationNumber: cells[cellMap.registrationNumber].innerText,
                    title: cells[cellMap.title].innerText,
                    type: cells[cellMap.type].innerText,
                    deliveryMethod: cells[cellMap.deliveryMethod].innerText,
                    gradeMode: cells[cellMap.gradeMode].innerText,
                    credits: cells[cellMap.credits].innerText,
                    days: cells[cellMap.days].innerText,
                    times: cells[cellMap.times].innerText,
                    location: cells[cellMap.location].innerText,
                    instructor: cells[cellMap.instructor].innerText,
                }
                results.push(course);
            }
            return results;
        }, CellMap);

        await banner.close();

        const courses = courseResults.map((cr: CourseResult) => {
            return {
                code: cr.code,
                credits: parseInt(cr.credits),
                days: cr.days,
                times: cr.times,
                location: cr.location,
                instructor: cr.instructor
            };
        });

        return courses;
    }
}