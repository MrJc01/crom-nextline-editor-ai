<?php

namespace App\Enums;

enum WorkspaceStatus: string
{
    case Stopped = 'stopped';
    case Starting = 'starting';
    case Running = 'running';
    case Error = 'error';

    public function isActive(): bool
    {
        return $this === self::Running || $this === self::Starting;
    }
}
