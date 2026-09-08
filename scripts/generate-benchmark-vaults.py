#!/usr/bin/env python3
"""Create disposable UTF-8 HTML vaults, independent of the user's real notes."""
from pathlib import Path
import argparse, html, json, uuid
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);a=p.parse_args()
root=a.destination.resolve()
if root.exists():raise SystemExit(f'Refusing to overwrite existing directory: {root}')
root.mkdir(parents=True)
topics=['検索','設計','読書','旅行','料理','研究','仕事','学習']
manifest=[]
css='body{font-family:system-ui;line-height:1.9;max-width:850px;margin:40px auto;padding:0 24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}a{color:#356b50}img{max-width:100%}'
for count in [100,1000,10000]:
    folder=root/f'vault-{count}';(folder/'notes').mkdir(parents=True);(folder/'styles').mkdir();(folder/'assets').mkdir()
    (folder/'styles/theme.css').write_text(css)
    (folder/'assets/diagram.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160"><rect width="640" height="160" fill="#e5eee6"/><text x="30" y="90" font-size="30">HTML → 読み取り → 検索</text></svg>')
    sizes=[]
    for i in range(count):
        topic=topics[i%len(topics)];target=5000 if i%100<90 else 20000 if i%100<99 else 100000
        heading=f'{topic}の記録 {i:05d}'
        prefix=f'<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><title>{heading}</title><meta name="note-id" content="{uuid.uuid5(uuid.NAMESPACE_URL,f"shiori-benchmark/{i}")}"><meta name="note-tag" content="分野/{topic}"><meta name="note-tag" content="検証"><link rel="stylesheet" href="../styles/theme.css"></head><body><main><h1 id="overview">{heading}</h1><p>識別子：SHIORI-{i:05d}。知識を整理するための検証用ノートです。</p><p><a href="note-{(i+1)%count:05d}.html#details">次のノート</a>・<a href="note-{(i+17)%count:05d}.html">関連ノート</a></p><h2 id="details">詳細</h2><table><tr><th>対象</th><th>項目</th></tr><tr><td>{topic}</td><td>A&amp;Bと日本語</td></tr></table>'
        body=[];length=len(prefix.encode())
        j=0
        while length<target:
            para=f'<p>{i:05d}-{j:04d}：{topic}についての観察と考察をまとめる。背景を確認し、具体例と結果を記録する。日々の知識を関連づけて、次の活動につなげる。</p>\n'
            body.append(para);length+=len(para.encode());j+=1
        suffix='<h2 id="summary">まとめ</h2><p>検証データ。実際の個人情報は含みません。</p>'
        if i%10==0:suffix+='<img src="../assets/diagram.svg" alt="共通の構成図">'
        text=prefix+''.join(body)+suffix+'</main></body></html>'
        file=folder/'notes'/f'note-{i:05d}.html';file.write_text(text);sizes.append(len(text.encode()))
    meta={'count':count,'root':str(folder),'html_bytes':sum(sizes),'min_bytes':min(sizes),'max_bytes':max(sizes),'mean_bytes':sum(sizes)/count,'size_distribution':'90% ~5KB, 9% ~20KB, 1% ~100KB','encoding':'UTF-8','topics':topics}
    manifest.append(meta);print(json.dumps(meta,ensure_ascii=False),flush=True)
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
