function gen() {
    const name = document.querySelector('body > div.header > div.headertitle > div.title').innerText.split(' ')[0]
    const description = document.querySelector('body > div.contents > div.textblock > p').innerText.split('\n').map(n => ` * ${n}`).join('\n')


    if (description.indexOf('abstract base class') > -1) {
        const childs = Array.from(document.querySelectorAll('body > div.contents > p:nth-child(2) > a')).map(n => n.innerText).join(' | \n')
        let text = `/**\n${description}\n */\n`
        text += `declare export type ${name} = \n${childs}`
        return text
    } else {
        const params_list = Array.from(document.querySelectorAll('body > div.contents > table.memberdecls:first-of-type > tbody > tr'))
        const datas = []
        let cache
        for (let param of params_list) {
            if (param.className.indexOf('memitem') === 0) {
                const name = param.childNodes[1].innerText.trim().slice(0, -1)
                let type = param.childNodes[0].innerText.trim()
                if (type.indexOf('string') > -1) type = 'string'
                else if (type.indexOf('int64') > -1) type = 'string'
                else if (type.indexOf('int') > -1) type = 'number'
                else if (type.indexOf('bool') > -1) type = 'boolean'
                type = type.replace(/object_ptr<(.+)>/, '$1').replace(/std::vector<(.+)>/, '$1[]')
                cache = { name, type }
            } else if (param.className.indexOf('memdesc') === 0) {
                const desc = param.childNodes[1].innerText.trim()
                cache.desc = desc
                datas.push(cache)
            }
        }

        const datastring = datas.reduce((pv, cv) => {
            let text = `${pv}    /**\n`
            text += `     * ${cv.desc}\n`
            text += `     */\n`
            text += `    ${cv.name}: ${cv.type};\n`
            return text
        }, `\n    '@type': "${name}";\n`)

        let text = `/**\n${description}\n */\n`
        text += `declare export type ${name} = {`
        text += datastring
        text += '}'

        return text
    }

}

gen()
