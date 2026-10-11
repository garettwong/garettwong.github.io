.setcpu "6502"
.segment "CODE"
; Restrict automatic battle-text acknowledgement to the active damage iterator.
; Victory also uses battle phase38 with a stale all-target command.
lda $73c0
bne :+
jmp old
:
lda $73fe
cmp #$b5
beq :+
jmp old
:
lda $2e
cmp #1
beq :+
jmp old
:
lda $30
cmp #34
bcs :+
jmp old
:
cmp #40
bcc :+
jmp old
:
lda $031e
cmp #$40
beq fast
cmp #$db
beq fast
cmp #$e2
beq :+
jmp old
:
fast:
lda $73c0
beq text
lda $55
cmp #$ff
beq text
lda $65
beq text
clear:
clc
lda $66
adc #$20
sta $66
lda $67
adc #0
sta $67
inc $65
lda $65
cmp $69
bne clear
lda #0
sta $65
text:
; Preserve native text interpreter, only automatically acknowledge battle text.
lda $6b
pha
lda #1
sta $6b
lda $73c0
beq single
lda #32
bne count
single:
lda #1
count:
pha
again:
lda #30
sta $6a
lda #7
sta $5f
lda $73c0
beq draw
lda #0
sta $0600
draw:
jsr $c7f1
lda $55
cmp #$ff
beq finished
pla
sec
sbc #1
pha
bne again
finished:
pla
pla
sta $6b
rts
old:
jmp $6c56
